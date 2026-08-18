"use strict";

const { loadJson } = require("./mse-25-31-approval-check");
const { loadReport: loadPreflight } = require("./mse-25-31-preflight-check");
const { loadReport: loadRollout, assertRolloutReport } = require("./mse-25-31-rollout-report-check");
const { run: runPreview } = require("./mse-25-31-network-preview");

function key(row = {}) {
  return `${String(row.siteSlug || "").trim()}:${String(row.pageSlug || "home").trim() || "home"}`;
}

function warningsByKey(rows = []) {
  return new Map((rows || []).map((row) => [key(row), Number(row.beforeWarnings || 0)]));
}

async function run({ rolloutReportPath, preflightReportPath, executionPlanPath, backendOrigin, tenantSlug, emitOutput = true, previewRunner = runPreview } = {}) {
  const { file: rolloutFile, report: rollout } = loadRollout(rolloutReportPath || process.env.MSE_25_31_ROLLOUT_REPORT);
  const verifiedRollout = assertRolloutReport(rollout);
  if (rollout.result?.writes !== true || rollout.result?.dryRun === true) {
    const error = new Error("La validation post-rollout exige un rollout MSE-25.31 réellement appliqué.");
    error.code = "MSE_25_31_POST_ROLLOUT_NOT_APPLICABLE";
    throw error;
  }
  const { file: preflightFile, report: preflight } = loadPreflight(preflightReportPath || process.env.MSE_25_31_PREFLIGHT_REPORT);
  const { file: executionFile, value: executionPlan } = loadJson(executionPlanPath || process.env.MSE_25_31_EXECUTION_PLAN, "MSE_25_31_EXECUTION_PLAN_NOT_FOUND");
  if (executionPlan.executionPlanFingerprint !== verifiedRollout.executionPlanFingerprint) {
    const error = new Error("Le plan d'exécution ne correspond pas au rollout à valider.");
    error.code = "MSE_25_31_POST_ROLLOUT_EXECUTION_PLAN_MISMATCH";
    throw error;
  }

  const after = await previewRunner({
    backendOrigin: backendOrigin || process.env.BACKEND_ORIGIN || preflight.context?.backendOrigin,
    tenantSlug: tenantSlug || process.env.TENANT_SLUG || preflight.context?.tenantSlug,
    minimumWords: preflight.context?.minimumWords,
    includeAllPages: true,
    emitOutput: false,
  });
  if (after.readOnly !== true || after.writes !== false || after.destructive !== false) {
    const error = new Error("Le contrôle post-rollout refuse un preview non read-only.");
    error.code = "MSE_25_31_POST_ROLLOUT_UNSAFE_PREVIEW";
    throw error;
  }

  const beforeRows = preflight.preview?.allPages || [];
  const afterMap = warningsByKey(after.allPages || []);
  const beforeMap = warningsByKey(beforeRows);
  const issues = [];
  const pages = [];

  for (const approved of executionPlan.pages || []) {
    const pageKey = key(approved);
    const beforeRow = beforeRows.find((row) => key(row) === pageKey) || null;
    const beforeWarnings = Number(beforeRow?.beforeWarnings || 0);
    const projectedWarnings = Number(beforeRow?.projectedWarnings ?? Math.max(0, beforeWarnings - Number(approved.projectedReduction || 0)));
    const afterWarnings = Number(afterMap.get(pageKey) || 0);
    const actualReduction = Math.max(0, beforeWarnings - afterWarnings);
    const expectedReduction = Number(approved.projectedReduction || 0);
    const ok = afterWarnings <= projectedWarnings && actualReduction >= expectedReduction;
    pages.push({ key: pageKey, beforeWarnings, projectedWarnings, afterWarnings, expectedReduction, actualReduction, ok });
    if (!ok) issues.push({ code: "projected-reduction-not-reached", key: pageKey, beforeWarnings, projectedWarnings, afterWarnings, expectedReduction, actualReduction });
  }

  const beforeTotalWarnings = [...beforeMap.values()].reduce((sum, value) => sum + value, 0);
  const afterTotalWarnings = [...afterMap.values()].reduce((sum, value) => sum + value, 0);
  if (afterTotalWarnings > beforeTotalWarnings) {
    issues.push({ code: "network-warning-regression", beforeTotalWarnings, afterTotalWarnings });
  }

  if (issues.length) {
    const error = new Error("La validation post-rollout MSE-25.31 détecte une réduction insuffisante ou une régression réseau.");
    error.code = "MSE_25_31_POST_ROLLOUT_VALIDATION_FAILED";
    error.details = { issues, pages, beforeTotalWarnings, afterTotalWarnings };
    throw error;
  }

  const result = {
    ok: true,
    readOnly: true,
    writes: false,
    rolloutReportPath: rolloutFile,
    preflightReportPath: preflightFile,
    executionPlanPath: executionFile,
    reportFingerprint: verifiedRollout.reportFingerprint,
    executionPlanFingerprint: verifiedRollout.executionPlanFingerprint,
    writeIntentFingerprint: verifiedRollout.writeIntentFingerprint,
    approvedPageCount: pages.length,
    beforeTotalWarnings,
    afterTotalWarnings,
    actualNetworkReduction: beforeTotalWarnings - afterTotalWarnings,
    pages,
  };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_31_POST_ROLLOUT_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { key, run, warningsByKey };
