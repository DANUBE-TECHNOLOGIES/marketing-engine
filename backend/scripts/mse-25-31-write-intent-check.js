"use strict";

const { loadJson } = require("./mse-25-31-approval-check");
const { assertExecutionPlan } = require("./mse-25-31-execution-plan-check");
const { loadReport } = require("./mse-25-31-preflight-check");
const { fetchCurrentPages } = require("./mse-25-31-write-intent");
const { jsonRequest } = require("./mse-25-31-network-preview");
const { buildQualityUpliftWriteIntents } = require("../src/modules/minisite-seo-enrichment/quality-uplift-write-intent");

function assertWriteIntent(writeIntent = {}, expected = {}) {
  if (writeIntent.version !== "mse-25.31" || writeIntent.operation !== "quality-uplift-write-intent") {
    const error = new Error("Le write-intent MSE-25.31 n'a pas un contrat reconnu.");
    error.code = "MSE_25_31_WRITE_INTENT_CONTRACT_INVALID";
    throw error;
  }
  if (writeIntent.readOnly !== true || writeIntent.writes !== false || writeIntent.publicWrites !== false || writeIntent.persistenceCallsPerformed !== 0) {
    const error = new Error("Le write-intent MSE-25.31 doit rester strictement sans écriture.");
    error.code = "MSE_25_31_WRITE_INTENT_SAFETY_INVALID";
    throw error;
  }
  const mismatches = [];
  for (const [field, actual, wanted] of [
    ["executionPlanFingerprint", writeIntent.executionPlanFingerprint, expected.executionPlanFingerprint],
    ["writeIntentFingerprint", writeIntent.writeIntentFingerprint, expected.writeIntentFingerprint],
    ["summary.approvedCandidateCount", writeIntent.summary?.approvedCandidateCount, expected.summary?.approvedCandidateCount],
    ["summary.touchedPageCount", writeIntent.summary?.touchedPageCount, expected.summary?.touchedPageCount],
  ]) {
    if (actual !== wanted) mismatches.push({ field, actual: actual ?? null, expected: wanted ?? null });
  }
  if (JSON.stringify(writeIntent.intents || []) !== JSON.stringify(expected.intents || [])) {
    mismatches.push({ field: "intents", actualCount: (writeIntent.intents || []).length, expectedCount: (expected.intents || []).length });
  }
  if (mismatches.length) {
    const error = new Error("Le write-intent ne correspond plus aux pages courantes et au plan d'exécution scellé.");
    error.code = "MSE_25_31_WRITE_INTENT_MISMATCH";
    error.details = { mismatches };
    throw error;
  }
  return {
    ok: true,
    readOnly: true,
    writes: false,
    publicWrites: false,
    persistenceCallsPerformed: 0,
    executionPlanFingerprint: expected.executionPlanFingerprint,
    writeIntentFingerprint: expected.writeIntentFingerprint,
    touchedPageCount: expected.summary.touchedPageCount,
  };
}

async function run({ writeIntentPath, executionPlanPath, approvalManifestPath, preflightReportPath, backendOrigin, tenantSlug, emitOutput = true, request = jsonRequest } = {}) {
  const writeIntentSource = writeIntentPath || process.env.MSE_25_31_WRITE_INTENT;
  const executionSource = executionPlanPath || process.env.MSE_25_31_EXECUTION_PLAN;
  const approvalSource = approvalManifestPath || process.env.MSE_25_31_APPROVAL_MANIFEST;
  const preflightSource = preflightReportPath || process.env.MSE_25_31_PREFLIGHT_REPORT;
  const { file: writeIntentFile, value: writeIntent } = loadJson(writeIntentSource, "MSE_25_31_WRITE_INTENT_NOT_FOUND");
  const { value: executionPlan } = loadJson(executionSource, "MSE_25_31_EXECUTION_PLAN_NOT_FOUND");
  const { value: approvalManifest } = loadJson(approvalSource, "MSE_25_31_APPROVAL_MANIFEST_NOT_FOUND");
  const { report: preflightReport } = loadReport(preflightSource);
  const verified = assertExecutionPlan(executionPlan, approvalManifest, preflightReport);
  if (!verified.executable) {
    const error = new Error("Le plan MSE-25.31 n'est plus exécutable.");
    error.code = "MSE_25_31_WRITE_INTENT_PLAN_NOT_EXECUTABLE";
    throw error;
  }
  const currentPages = await fetchCurrentPages(executionPlan, {
    backendOrigin: backendOrigin || process.env.BACKEND_ORIGIN || preflightReport.context?.backendOrigin,
    tenantSlug: tenantSlug || process.env.TENANT_SLUG || preflightReport.context?.tenantSlug,
    request,
  });
  const expected = buildQualityUpliftWriteIntents({ executionPlan, currentPages });
  const result = { ...assertWriteIntent(writeIntent, expected), writeIntentPath: writeIntentFile };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, publicWrites: false, error: error.code || "MSE_25_31_WRITE_INTENT_CHECK_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { assertWriteIntent, run };
