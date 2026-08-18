"use strict";

const {
  loadJson,
} = require("./mse-25-31-approval-check");
const { assertExecutionPlan } = require("./mse-25-31-execution-plan-check");
const { loadReport } = require("./mse-25-31-preflight-check");
const {
  EXPECTED_BRANCH,
  assertRepositoryState,
  repositoryState,
} = require("./mse-25-31-preflight");

function isExplicitConfirmation(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function assertApplyAuthorization({
  executionPlan,
  approvalManifest,
  preflightReport,
  repository,
  confirm,
  approvedExecutionPlanFingerprint,
  expectedBranch = EXPECTED_BRANCH,
} = {}) {
  if (!isExplicitConfirmation(confirm)) {
    const error = new Error("L'apply MSE-25.31 exige une confirmation opérateur explicite confirm=true.");
    error.code = "MSE_25_31_APPLY_CONFIRMATION_REQUIRED";
    throw error;
  }

  const verifiedPlan = assertExecutionPlan(executionPlan, approvalManifest, preflightReport);
  if (verifiedPlan.summary.approvedCount <= 0) {
    const error = new Error("Aucune page explicitement approuvée n'est disponible pour l'apply MSE-25.31.");
    error.code = "MSE_25_31_APPLY_NO_APPROVED_PAGES";
    throw error;
  }
  if (!verifiedPlan.executable) {
    const error = new Error("Le plan contient au moins une opération approuvée dont le payload final d'écriture n'est pas entièrement scellé.");
    error.code = "MSE_25_31_APPLY_INCOMPLETE_WRITE_PAYLOAD";
    error.details = {
      approvedCount: verifiedPlan.summary.approvedCount,
      payloadIncompleteCount: verifiedPlan.summary.payloadIncompleteCount || 0,
    };
    throw error;
  }

  const expectedFingerprint = String(approvedExecutionPlanFingerprint || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedFingerprint)) {
    const error = new Error("Le fingerprint du plan d'exécution approuvé doit être fourni explicitement et être un SHA-256 complet.");
    error.code = "MSE_25_31_APPLY_EXECUTION_FINGERPRINT_REQUIRED";
    throw error;
  }
  if (expectedFingerprint !== verifiedPlan.executionPlanFingerprint) {
    const error = new Error("Le fingerprint approuvé ne correspond pas au plan d'exécution scellé.");
    error.code = "MSE_25_31_APPLY_EXECUTION_FINGERPRINT_MISMATCH";
    error.details = {
      approvedExecutionPlanFingerprint: expectedFingerprint,
      actualExecutionPlanFingerprint: verifiedPlan.executionPlanFingerprint,
    };
    throw error;
  }

  const repo = assertRepositoryState(repository, { expectedBranch, allowDirty: false });
  const sourceHead = String(preflightReport?.repository?.head || "").trim().toLowerCase();
  const currentHead = String(repo.head || "").trim().toLowerCase();
  if (!sourceHead || currentHead !== sourceHead) {
    const error = new Error("Le HEAD Git courant ne correspond plus au HEAD scellé dans le preflight MSE-25.31.");
    error.code = "MSE_25_31_APPLY_HEAD_MISMATCH";
    error.details = { currentHead: currentHead || null, preflightHead: sourceHead || null };
    throw error;
  }

  return {
    ok: true,
    authorized: true,
    confirmationVerified: true,
    readOnlyGate: true,
    writes: false,
    destructive: false,
    publicWrites: false,
    repository: repo,
    executionPlanFingerprint: verifiedPlan.executionPlanFingerprint,
    planFingerprint: verifiedPlan.planFingerprint,
    candidateSetFingerprint: verifiedPlan.candidateSetFingerprint,
    approvalDecisionFingerprint: verifiedPlan.approvalDecisionFingerprint,
    approvedPageCount: verifiedPlan.summary.approvedCount,
    approvedManualReviewCount: verifiedPlan.summary.approvedManualReviewCount,
  };
}

function run({
  executionPlanPath,
  approvalManifestPath,
  preflightReportPath,
  confirm,
  approvedExecutionPlanFingerprint,
  emitOutput = true,
  repositoryReader = repositoryState,
} = {}) {
  const executionSource = executionPlanPath || process.env.MSE_25_31_EXECUTION_PLAN;
  const approvalSource = approvalManifestPath || process.env.MSE_25_31_APPROVAL_MANIFEST;
  const preflightSource = preflightReportPath || process.env.MSE_25_31_PREFLIGHT_REPORT;
  const { file: executionFile, value: executionPlan } = loadJson(executionSource, "MSE_25_31_EXECUTION_PLAN_NOT_FOUND");
  const { file: approvalFile, value: approvalManifest } = loadJson(approvalSource, "MSE_25_31_APPROVAL_MANIFEST_NOT_FOUND");
  const { file: preflightFile, report: preflightReport } = loadReport(preflightSource);

  const result = {
    ...assertApplyAuthorization({
      executionPlan,
      approvalManifest,
      preflightReport,
      repository: repositoryReader(),
      confirm: confirm ?? process.env.MSE_25_31_CONFIRM,
      approvedExecutionPlanFingerprint: approvedExecutionPlanFingerprint || process.env.MSE_25_31_APPROVED_EXECUTION_FINGERPRINT,
      expectedBranch: process.env.MSE_25_31_EXPECTED_BRANCH || EXPECTED_BRANCH,
    }),
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
      authorized: false,
      writes: false,
      publicWrites: false,
      error: error.code || "MSE_25_31_APPLY_GATE_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  assertApplyAuthorization,
  isExplicitConfirmation,
  run,
};
