"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { runDirect } = require("./mse-25-40-network-preview");
const { buildConsolidatedExecutionPlan } = require("../src/modules/minisite-semantic-engine/consolidated-execution-plan");
const { buildResidualExecutionPlan } = require("../src/modules/minisite-semantic-engine/residual-execution-plan");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function loadJson(file, code) {
  if (!file) {
    const error = new Error("Fichier MSE-25.40 requis.");
    error.code = code;
    throw error;
  }
  const resolved = path.resolve(file);
  return { file: resolved, value: JSON.parse(fs.readFileSync(resolved, "utf8")) };
}

function assertRollout(report = {}) {
  if (
    report.type !== "mse-25.40-network-rollout-report"
    || report.result?.ok !== true
    || report.result?.dryRun === true
    || report.result?.writes !== true
    || report.result?.publicWrites !== true
    || report.result?.versioned !== true
    || report.result?.rollbackReady !== true
    || !/^[0-9a-f]{64}$/i.test(String(report.reportFingerprint || ""))
  ) {
    const error = new Error("Le rapport de rollout réel MSE-25.40 n'est pas certifiable.");
    error.code = "MSE_25_40_POST_ROLLOUT_INVALID_SOURCE";
    throw error;
  }
  return report;
}

function writtenTargets(writeIntent = {}) {
  const targets = [];
  for (const intent of writeIntent.intents || []) {
    const seen = new Set();
    for (const block of intent.snapshot?.after?.blocks || []) {
      if (block?.seo?.generatedBy !== "mse-25.40" || block?.seo?.purpose !== "residual-semantic-uplift") continue;
      const intentKey = String(block.seo.intentKey || "").trim();
      if (!intentKey || seen.has(intentKey)) continue;
      seen.add(intentKey);
      targets.push({
        siteSlug: intent.siteSlug,
        agencyId: intent.agencyId,
        pageSlug: intent.pageSlug,
        intentKey,
        targetSnapshotFingerprint: intent.targetSnapshotFingerprint || null,
      });
    }
  }
  return targets.sort((a, b) => `${a.siteSlug}:${a.pageSlug}:${a.intentKey}`.localeCompare(`${b.siteSlug}:${b.pageSlug}:${b.intentKey}`, "fr"));
}

function freshCoverage(networkPlan = {}, target = {}) {
  const agency = (networkPlan.agencies || []).find((row) => String(row.site?.slug) === String(target.siteSlug));
  const coverage = (agency?.coverage || []).find((row) => String(row.intentKey) === String(target.intentKey));
  return coverage || null;
}

function freshResidualDecision(residualPlan = {}, target = {}) {
  const site = (residualPlan.sites || []).find((row) => String(row.siteSlug) === String(target.siteSlug));
  const page = (site?.pages || []).find((row) => String(row.pageSlug) === String(target.pageSlug));
  const eligible = (page?.eligibleSections || []).find((row) => String(row.intentKey) === String(target.intentKey));
  const suppressed = (page?.suppressedSections || []).find((row) => String(row.intentKey) === String(target.intentKey));
  return {
    pageExecutable: page?.executable === true,
    targetEligible: Boolean(eligible),
    suppressionReason: suppressed?.suppressionReason || null,
  };
}

function evaluateTarget(networkPlan, residualPlan, target) {
  const coverage = freshCoverage(networkPlan, target);
  const residual = freshResidualDecision(residualPlan, target);
  const coverageSatisfied = Boolean(coverage && ["covered", "strong"].includes(String(coverage.status)));
  const closed = residual.targetEligible === false && (
    coverageSatisfied
    || residual.suppressionReason === "managed-route-preferred"
    || residual.suppressionReason === "intent-covered-elsewhere"
    || residual.suppressionReason === "intent-covered-on-target-page"
  );
  return {
    ...target,
    coverageStatus: coverage?.status || null,
    bestPageSlug: coverage?.bestPageSlug || null,
    bestScore: Number(coverage?.bestScore || 0),
    bestLocalityScore: Number(coverage?.bestLocalityScore || 0),
    residualTargetEligible: residual.targetEligible,
    residualPageExecutable: residual.pageExecutable,
    suppressionReason: residual.suppressionReason,
    closed,
  };
}

function defaultOutputPath(reportDir, rolloutFingerprint) {
  return path.join(reportDir, `mse-25-40-post-rollout-${String(rolloutFingerprint || "unknown").slice(0, 12)}.json`);
}

async function run({ rolloutReportPath, writeIntentPath, tenantSlug, envFile, output, emitOutput = true, previewRunner = runDirect } = {}) {
  const reportDir = path.resolve(process.env.MSE_25_40_REPORT_DIR || path.join(os.homedir(), "mse-25-40-reports"));
  const rolloutSource = rolloutReportPath || process.env.MSE_25_40_ROLLOUT_REPORT;
  const { file: rolloutFile, value: rollout } = loadJson(rolloutSource, "MSE_25_40_POST_ROLLOUT_REPORT_REQUIRED");
  assertRollout(rollout);

  const writeSource = writeIntentPath || process.env.MSE_25_40_WRITE_INTENT || rollout.proof?.writeIntentPath;
  const { file: writeFile, value: writeIntent } = loadJson(writeSource, "MSE_25_40_POST_ROLLOUT_WRITE_INTENT_REQUIRED");
  if (String(writeIntent.writeIntentFingerprint || "") !== String(rollout.proof?.writeIntentFingerprint || "")) {
    const error = new Error("Le write-intent ne correspond pas au rollout scellé.");
    error.code = "MSE_25_40_POST_ROLLOUT_WRITE_INTENT_MISMATCH";
    throw error;
  }

  const effectiveTenant = String(tenantSlug || process.env.TENANT_SLUG || rollout.context?.tenantSlug || "mondescale").trim();
  const networkPlan = await previewRunner({
    tenantSlug: effectiveTenant,
    envFile: envFile || process.env.MSE_25_40_ENV_FILE,
  });
  const consolidatedPlan = buildConsolidatedExecutionPlan(networkPlan);
  const residualPlan = buildResidualExecutionPlan(networkPlan, consolidatedPlan);
  const targets = writtenTargets(writeIntent).map((target) => evaluateTarget(networkPlan, residualPlan, target));

  const closureCertified = (
    targets.length > 0
    && targets.every((target) => target.closed === true)
    && residualPlan.summary?.eligibleSectionCount === 0
    && residualPlan.summary?.eligibleMetadataPageCount === 0
    && residualPlan.summary?.homeSecondarySectionWriteCount === 0
    && residualPlan.summary?.automaticWriteCount === 0
  );

  const result = {
    version: "mse-25.40",
    type: "mse-25.40-post-rollout-validation",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    destructive: false,
    source: {
      rolloutReportPath: rolloutFile,
      rolloutReportFingerprint: rollout.reportFingerprint,
      writeIntentPath: writeFile,
      writeIntentFingerprint: writeIntent.writeIntentFingerprint,
    },
    fresh: {
      planFingerprint: networkPlan.planFingerprint,
      consolidatedExecutionFingerprint: consolidatedPlan.executionFingerprint,
      residualExecutionFingerprint: residualPlan.residualExecutionFingerprint,
    },
    policy: {
      requireAllWrittenTargetsClosed: true,
      requireZeroResidualEligibleSections: true,
      requireZeroResidualMetadataWrites: true,
      requireZeroHomeSecondaryWrites: true,
      requireZeroAutomaticWrites: true,
    },
    targets,
    residualSummary: residualPlan.summary,
    summary: {
      targetCount: targets.length,
      closedTargetCount: targets.filter((target) => target.closed).length,
      openTargetCount: targets.filter((target) => !target.closed).length,
      residualExecutablePageCount: Number(residualPlan.summary?.executablePageCount || 0),
      residualEligibleSectionCount: Number(residualPlan.summary?.eligibleSectionCount || 0),
      residualEligibleMetadataPageCount: Number(residualPlan.summary?.eligibleMetadataPageCount || 0),
      homeSecondarySectionWriteCount: Number(residualPlan.summary?.homeSecondarySectionWriteCount || 0),
      automaticWriteCount: Number(residualPlan.summary?.automaticWriteCount || 0),
      closureCertified,
    },
  };
  result.validationFingerprint = digest(result);

  const target = path.resolve(output || process.env.MSE_25_40_POST_ROLLOUT_OUTPUT || defaultOutputPath(reportDir, rollout.reportFingerprint));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + "\n", "utf8");

  if (!closureCertified) {
    const error = new Error("La clôture MSE-25.40 n'est pas encore certifiée sur l'état public post-rollout.");
    error.code = "MSE_25_40_POST_ROLLOUT_CLOSURE_NOT_CERTIFIED";
    error.details = { reportPath: target, summary: result.summary, targets: result.targets };
    throw error;
  }

  const summary = {
    ok: true,
    readOnly: true,
    writes: false,
    closureCertified: true,
    targetCount: result.summary.targetCount,
    closedTargetCount: result.summary.closedTargetCount,
    residualExecutablePageCount: result.summary.residualExecutablePageCount,
    residualEligibleSectionCount: result.summary.residualEligibleSectionCount,
    validationFingerprint: result.validationFingerprint,
    reportPath: target,
  };
  if (emitOutput) console.log(JSON.stringify(summary, null, 2));
  return { ...summary, result };
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      readOnly: true,
      writes: false,
      error: error.code || "MSE_25_40_POST_ROLLOUT_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  assertRollout,
  defaultOutputPath,
  digest,
  evaluateTarget,
  freshCoverage,
  freshResidualDecision,
  loadJson,
  run,
  writtenTargets,
};
