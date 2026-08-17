"use strict";

const {
  loadJson,
} = require("./mse-25-31-approval-check");
const { buildExecutionPlan } = require("./mse-25-31-execution-plan");
const { loadReport } = require("./mse-25-31-preflight-check");

function assertExecutionPlan(plan = {}, manifest = {}, preflightReport = {}) {
  if (plan.version !== "mse-25.31" || plan.operation !== "quality-uplift-execution-plan") {
    const error = new Error("Le plan d'exécution MSE-25.31 n'a pas un contrat reconnu.");
    error.code = "MSE_25_31_EXECUTION_PLAN_CONTRACT_INVALID";
    throw error;
  }
  if (
    plan.readOnly !== true
    || plan.writes !== false
    || plan.destructive !== false
    || plan.publicWrites !== false
  ) {
    const error = new Error("Le plan d'exécution MSE-25.31 doit rester strictement sans écriture publique.");
    error.code = "MSE_25_31_EXECUTION_PLAN_SAFETY_INVALID";
    throw error;
  }

  const expected = buildExecutionPlan(manifest, preflightReport);
  const mismatches = [];
  for (const [field, actual, wanted] of [
    ["executionPlanFingerprint", plan.executionPlanFingerprint, expected.executionPlanFingerprint],
    ["planFingerprint", plan.source?.planFingerprint, expected.source.planFingerprint],
    ["candidateSetFingerprint", plan.source?.candidateSetFingerprint, expected.source.candidateSetFingerprint],
    ["approvalDecisionFingerprint", plan.source?.approvalDecisionFingerprint, expected.source.approvalDecisionFingerprint],
    ["repository.branch", plan.source?.repository?.branch, expected.source.repository.branch],
    ["repository.head", plan.source?.repository?.head, expected.source.repository.head],
    ["context.tenantSlug", plan.source?.context?.tenantSlug, expected.source.context.tenantSlug],
    ["context.backendOrigin", plan.source?.context?.backendOrigin, expected.source.context.backendOrigin],
  ]) {
    if (actual !== wanted) mismatches.push({ field, actual: actual ?? null, expected: wanted ?? null });
  }

  if (JSON.stringify(plan.pages || []) !== JSON.stringify(expected.pages)) {
    mismatches.push({ field: "pages", actualCount: (plan.pages || []).length, expectedCount: expected.pages.length });
  }
  if (Boolean(plan.executable) !== Boolean(expected.executable)) {
    mismatches.push({ field: "executable", actual: Boolean(plan.executable), expected: Boolean(expected.executable) });
  }

  if (mismatches.length > 0) {
    const error = new Error("Le plan d'exécution ne correspond plus au preflight et aux approbations validées.");
    error.code = "MSE_25_31_EXECUTION_PLAN_MISMATCH";
    error.details = { mismatches };
    throw error;
  }

  return {
    ok: true,
    readOnly: true,
    writes: false,
    destructive: false,
    publicWrites: false,
    executable: expected.executable,
    executionPlanFingerprint: expected.executionPlanFingerprint,
    planFingerprint: expected.source.planFingerprint,
    candidateSetFingerprint: expected.source.candidateSetFingerprint,
    approvalDecisionFingerprint: expected.source.approvalDecisionFingerprint,
    summary: expected.summary,
  };
}

function run({ executionPlanPath, approvalManifestPath, preflightReportPath, emitOutput = true } = {}) {
  const executionSource = executionPlanPath || process.env.MSE_25_31_EXECUTION_PLAN;
  const approvalSource = approvalManifestPath || process.env.MSE_25_31_APPROVAL_MANIFEST;
  const preflightSource = preflightReportPath || process.env.MSE_25_31_PREFLIGHT_REPORT;
  const { file: executionFile, value: plan } = loadJson(executionSource, "MSE_25_31_EXECUTION_PLAN_NOT_FOUND");
  const { file: approvalFile, value: manifest } = loadJson(approvalSource, "MSE_25_31_APPROVAL_MANIFEST_NOT_FOUND");
  const { file: preflightFile, report } = loadReport(preflightSource);
  const result = {
    ...assertExecutionPlan(plan, manifest, report),
    executionPlanPath: executionFile,
    approvalManifestPath: approvalFile,
    preflightReportPath: preflightFile,
  };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_31_EXECUTION_PLAN_CHECK_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  assertExecutionPlan,
  run,
};
