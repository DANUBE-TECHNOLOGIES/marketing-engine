"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { assertApprovedScopeAudit } = require("./post-rollout-audit");
const { assertRollbackManifestIntegrity } = require("./network-rollback-audit");
const { assertRolloutReportIntegrity } = require("./rollout-report-integrity");
const { assertBaselineAttestation } = require("./baseline-attestation-audit");

function resolveReportPath(value) {
  const configured = String(
    value
      || process.env.MSE_25_30_ROLLOUT_REPORT
      || process.env.MSE_25_30_ROLLBACK_MANIFEST
      || ""
  ).trim();
  if (!configured) {
    const error = new Error("Un rapport de rollout MSE-25.30 est obligatoire pour le contrôle hors ligne.");
    error.code = "MSE_25_30_ROLLOUT_REPORT_CHECK_REQUIRED";
    throw error;
  }
  return path.resolve(configured);
}

function readReport(filePath) {
  const resolvedPath = resolveReportPath(filePath);
  try {
    return {
      reportPath: resolvedPath,
      report: JSON.parse(fs.readFileSync(resolvedPath, "utf8")),
    };
  } catch (cause) {
    const error = new Error(`Impossible de lire le rapport de rollout : ${resolvedPath}`);
    error.code = "MSE_25_30_ROLLOUT_REPORT_CHECK_INVALID";
    error.details = { reportPath: resolvedPath, cause: cause?.message || String(cause) };
    throw error;
  }
}

function checkRolloutReport(report = {}) {
  const rolloutReportIntegrity = assertRolloutReportIntegrity(report);
  const baselineAttestationAudit = assertBaselineAttestation(report);
  const approvedScopeAudit = assertApprovedScopeAudit(report);
  const rollbackManifestAudit = assertRollbackManifestIntegrity(report);

  return {
    ok: true,
    readOnly: true,
    offline: true,
    rolloutReportIntegrity,
    baselineAttestationAudit,
    approvedScopeAudit,
    rollbackManifestAudit,
  };
}

function run({ rolloutReport } = {}) {
  const loaded = readReport(rolloutReport);
  const result = {
    ...checkRolloutReport(loaded.report),
    reportPath: loaded.reportPath,
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  try {
    run({ rolloutReport: process.argv[2] });
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      readOnly: true,
      offline: true,
      error: error.code || "MSE_25_30_ROLLOUT_REPORT_CHECK_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  checkRolloutReport,
  readReport,
  resolveReportPath,
  run,
};
