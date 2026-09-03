"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  EXPECTED_WORKFLOW_BLOB_SHA,
  assertAttestation,
} = require("./mse-25-31-ci-attestation");

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function loadReport(filePath) {
  const configured = String(filePath || process.env.MSE_25_31_ROLLOUT_REPORT || "").trim();
  if (!configured) {
    const error = new Error("Le rapport de rollout MSE-25.31 est obligatoire.");
    error.code = "MSE_25_31_ROLLOUT_REPORT_REQUIRED";
    throw error;
  }
  const file = path.resolve(configured);
  return { file, report: JSON.parse(fs.readFileSync(file, "utf8")) };
}

function assertRolloutReport(report = {}) {
  const issues = [];
  if (report.type !== "mse-25.31-network-rollout-report") issues.push({ code: "contract-invalid" });
  const recomputed = digest({
    type: report.type,
    repository: report.repository,
    context: report.context,
    proof: report.proof,
    result: report.result,
    rollbackManifest: report.rollbackManifest || [],
  });
  if (!/^[0-9a-f]{64}$/.test(String(report.reportFingerprint || "")) || report.reportFingerprint !== recomputed) {
    issues.push({ code: "report-fingerprint-mismatch", actual: report.reportFingerprint || null, expected: recomputed });
  }
  if (report.proof?.executionPlanFingerprint !== report.result?.executionPlanFingerprint) {
    issues.push({ code: "execution-fingerprint-mismatch" });
  }
  if (report.proof?.writeIntentFingerprint !== report.result?.writeIntentFingerprint) {
    issues.push({ code: "write-intent-fingerprint-mismatch" });
  }
  if (report.proof?.preflightCheck?.ok !== true) issues.push({ code: "preflight-check-missing" });
  if (report.proof?.ciAttestationCheck?.ok !== true) issues.push({ code: "ci-attestation-check-missing" });
  if (report.proof?.applyAuthorization?.authorized !== true) issues.push({ code: "apply-authorization-missing" });
  if (report.proof?.writeIntentCheck?.ok !== true) issues.push({ code: "write-intent-check-missing" });

  try {
    assertAttestation(report.proof?.liveCiAttestation || {}, {
      head: report.repository?.head,
      branch: report.repository?.branch,
      workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA,
    });
  } catch (error) {
    issues.push({ code: "live-ci-attestation-invalid", details: error.details || {} });
  }

  const manifest = Array.isArray(report.rollbackManifest) ? report.rollbackManifest : [];
  if (report.result?.writes === true) {
    const pagesWritten = Number(report.result.pagesWritten || 0);
    const snapshots = Number(report.result.rollbackSnapshots || 0);
    if (pagesWritten <= 0) issues.push({ code: "writes-without-pages" });
    if (pagesWritten !== snapshots || pagesWritten !== manifest.length) {
      issues.push({ code: "rollback-manifest-count-mismatch", pagesWritten, rollbackSnapshots: snapshots, manifestCount: manifest.length });
    }
    if (report.result.rollbackReady !== true) issues.push({ code: "rollback-not-ready" });
    for (const entry of manifest) {
      if (!entry?.agencyId || !entry?.siteSlug || !entry?.pageSlug || !entry?.rollbackVersionId) {
        issues.push({ code: "rollback-entry-invalid", entry });
      }
    }
  } else if (manifest.length > 0) {
    issues.push({ code: "dry-run-with-rollback-manifest", manifestCount: manifest.length });
  }

  if (issues.length) {
    const error = new Error("Le rapport de rollout MSE-25.31 n'est pas intègre.");
    error.code = "MSE_25_31_ROLLOUT_REPORT_INVALID";
    error.details = { issues };
    throw error;
  }

  return {
    ok: true,
    reportFingerprint: recomputed,
    dryRun: report.result?.dryRun === true,
    writes: report.result?.writes === true,
    ciRunId: report.proof.liveCiAttestation.runId,
    pagesWritten: Number(report.result?.pagesWritten || 0),
    rollbackSnapshots: Number(report.result?.rollbackSnapshots || 0),
    executionPlanFingerprint: report.result?.executionPlanFingerprint || null,
    writeIntentFingerprint: report.result?.writeIntentFingerprint || null,
  };
}

function run({ reportPath, emitOutput = true } = {}) {
  const { file, report } = loadReport(reportPath);
  const result = { ...assertRolloutReport(report), reportPath: file };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  try { run(); }
  catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_31_ROLLOUT_REPORT_CHECK_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { assertRolloutReport, digest, loadReport, run };
