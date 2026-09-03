"use strict";

const {
  EXPECTED_BRANCH,
  EXPECTED_GITHUB_WORKFLOW_BLOB_SHA,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
} = require("../../../scripts/mse-25-30-preflight");

function normalizeSha(value) {
  return String(value || "").trim().toLowerCase();
}

function attestationIssues(attestation, expectedSha, source) {
  const issues = [];
  if (!attestation || attestation.ok !== true) {
    return [{ code: `${source}-missing`, source }];
  }
  if (normalizeSha(attestation.headSha) !== expectedSha) {
    issues.push({ code: `${source}-sha-mismatch`, source, expected: expectedSha || null, actual: attestation.headSha || null });
  }
  if (attestation.workflowId !== GITHUB_WORKFLOW_ID || attestation.workflowName !== GITHUB_WORKFLOW_NAME) {
    issues.push({
      code: `${source}-workflow-mismatch`,
      source,
      workflowId: attestation.workflowId ?? null,
      workflowName: attestation.workflowName ?? null,
    });
  }
  if (attestation.workflowPath !== GITHUB_WORKFLOW_PATH || normalizeSha(attestation.workflowBlobSha) !== EXPECTED_GITHUB_WORKFLOW_BLOB_SHA) {
    issues.push({
      code: `${source}-workflow-definition-mismatch`,
      source,
      expectedPath: GITHUB_WORKFLOW_PATH,
      actualPath: attestation.workflowPath ?? null,
      expectedBlobSha: EXPECTED_GITHUB_WORKFLOW_BLOB_SHA,
      actualBlobSha: attestation.workflowBlobSha ?? null,
    });
  }
  if (attestation.headBranch !== EXPECTED_BRANCH) {
    issues.push({ code: `${source}-branch-mismatch`, source, expected: EXPECTED_BRANCH, actual: attestation.headBranch ?? null });
  }
  if (attestation.event !== "push" || attestation.status !== "completed" || attestation.conclusion !== "success") {
    issues.push({
      code: `${source}-result-mismatch`,
      source,
      event: attestation.event ?? null,
      status: attestation.status ?? null,
      conclusion: attestation.conclusion ?? null,
    });
  }
  if (!Number.isInteger(attestation.runId) || attestation.runId <= 0) {
    issues.push({ code: `${source}-run-id-invalid`, source, runId: attestation.runId ?? null });
  }
  return issues;
}

function auditBaselineAttestation(report = {}) {
  const repositorySha = normalizeSha(report?.repository?.validatedBaseSha);
  const topPreflightSha = normalizeSha(report?.preflight?.validatedBaseSha);
  const resultPreflightSha = normalizeSha(report?.result?.preflight?.validatedBaseSha);
  const issues = [];

  if (!repositorySha || !topPreflightSha || !resultPreflightSha
      || repositorySha !== topPreflightSha
      || topPreflightSha !== resultPreflightSha) {
    issues.push({
      code: "validated-base-sha-mismatch",
      repository: repositorySha || null,
      preflight: topPreflightSha || null,
      resultPreflight: resultPreflightSha || null,
    });
  }

  const attestations = [
    ["repository-attestation", report?.repository?.validatedBaselineAttestation],
    ["preflight-attestation", report?.preflight?.baselineAttestation],
    ["result-preflight-attestation", report?.result?.preflight?.baselineAttestation],
  ];
  for (const [source, attestation] of attestations) {
    issues.push(...attestationIssues(attestation, repositorySha, source));
  }

  const runIds = attestations
    .map(([, attestation]) => attestation?.runId)
    .filter((value) => Number.isInteger(value) && value > 0);
  if (runIds.length === attestations.length && new Set(runIds).size !== 1) {
    issues.push({ code: "baseline-attestation-run-mismatch", runIds });
  }

  return {
    ok: issues.length === 0,
    validatedBaseSha: repositorySha || null,
    workflowId: GITHUB_WORKFLOW_ID,
    workflowName: GITHUB_WORKFLOW_NAME,
    workflowPath: GITHUB_WORKFLOW_PATH,
    workflowBlobSha: EXPECTED_GITHUB_WORKFLOW_BLOB_SHA,
    runId: runIds.length === attestations.length && new Set(runIds).size === 1 ? runIds[0] : null,
    issues,
  };
}

function assertBaselineAttestation(report = {}) {
  const audit = auditBaselineAttestation(report);
  if (!audit.ok) {
    const error = new Error("Le rapport de rollout ne contient pas une attestation CI cohérente de sa baseline MSE-25.30 et de la définition du workflow qui l'a validée.");
    error.code = "MSE_25_30_ROLLOUT_BASELINE_CI_ATTESTATION_MISMATCH";
    error.details = audit;
    throw error;
  }
  return audit;
}

module.exports = {
  assertBaselineAttestation,
  attestationIssues,
  auditBaselineAttestation,
  normalizeSha,
};
