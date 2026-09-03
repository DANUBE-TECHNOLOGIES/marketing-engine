"use strict";

const ROLLOUT_REPORT_TYPE = "mse-25.30-network-rollout-report";

function stableComparable(value) {
  if (Array.isArray(value)) return value.map(stableComparable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableComparable(value[key])]));
  }
  return value;
}

function sameValue(left, right) {
  return JSON.stringify(stableComparable(left)) === JSON.stringify(stableComparable(right));
}

function normalizeFingerprint(value) {
  return String(value || "").trim().toLowerCase();
}

function auditRolloutReportIntegrity(report = {}) {
  const issues = [];
  const repositoryHead = String(report?.repository?.head || "").trim();
  const preflightRepositoryHead = String(report?.preflight?.repositoryHead || report?.result?.preflight?.repositoryHead || "").trim();
  const topPreflightFingerprint = normalizeFingerprint(report?.preflight?.planFingerprint);
  const resultPreflightFingerprint = normalizeFingerprint(report?.result?.preflight?.planFingerprint);
  const approvedFingerprint = normalizeFingerprint(report?.result?.approvedPlanFingerprint);
  const topPreflightParameters = report?.preflight?.parameters;
  const resultPreflightParameters = report?.result?.preflight?.parameters;
  const appliedParameters = report?.result?.parameters;

  if (report?.type !== ROLLOUT_REPORT_TYPE) {
    issues.push({ code: "report-type-mismatch", expected: ROLLOUT_REPORT_TYPE, actual: report?.type || null });
  }
  if (report?.result?.ok !== true || report?.result?.writes !== true) {
    issues.push({ code: "rollout-not-successfully-applied", ok: report?.result?.ok ?? null, writes: report?.result?.writes ?? null });
  }
  if (!repositoryHead || !preflightRepositoryHead || repositoryHead !== preflightRepositoryHead) {
    issues.push({ code: "repository-head-mismatch", repositoryHead: repositoryHead || null, preflightRepositoryHead: preflightRepositoryHead || null });
  }
  if (!topPreflightFingerprint || !resultPreflightFingerprint || !approvedFingerprint
      || topPreflightFingerprint !== resultPreflightFingerprint
      || resultPreflightFingerprint !== approvedFingerprint) {
    issues.push({
      code: "plan-fingerprint-mismatch",
      preflight: topPreflightFingerprint || null,
      resultPreflight: resultPreflightFingerprint || null,
      approved: approvedFingerprint || null,
    });
  }
  if (!topPreflightParameters || !resultPreflightParameters || !appliedParameters
      || !sameValue(topPreflightParameters, resultPreflightParameters)
      || !sameValue(resultPreflightParameters, appliedParameters)) {
    issues.push({
      code: "rollout-parameters-mismatch",
      preflight: topPreflightParameters || null,
      resultPreflight: resultPreflightParameters || null,
      applied: appliedParameters || null,
    });
  }

  return {
    ok: issues.length === 0,
    repositoryHead: repositoryHead || null,
    planFingerprint: approvedFingerprint || null,
    parameters: appliedParameters || null,
    issues,
  };
}

function assertRolloutReportIntegrity(report = {}) {
  const audit = auditRolloutReportIntegrity(report);
  if (!audit.ok) {
    const error = new Error("Le rapport de rollout MSE-25.30 contient des preuves internes incohérentes.");
    error.code = "MSE_25_30_ROLLOUT_REPORT_INTEGRITY_MISMATCH";
    error.details = audit;
    throw error;
  }
  return audit;
}

module.exports = {
  ROLLOUT_REPORT_TYPE,
  assertRolloutReportIntegrity,
  auditRolloutReportIntegrity,
  normalizeFingerprint,
  sameValue,
  stableComparable,
};
