"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { digest } = require("../scripts/mse-25-31-rollout-report-check");
const { run } = require("../scripts/mse-25-31-network-rollback");
const {
  EXPECTED_WORKFLOW_BLOB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
} = require("../scripts/mse-25-31-ci-attestation");

const BRANCH = "feature/mse-25-31-local-seo-quality-uplift";
const HEAD = "a".repeat(40);
function ciAttestation() {
  return { ok: true, repository: GITHUB_REPOSITORY, workflowId: GITHUB_WORKFLOW_ID, workflowName: GITHUB_WORKFLOW_NAME, workflowPath: GITHUB_WORKFLOW_PATH, workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA, runId: 123, headSha: HEAD, headBranch: BRANCH, event: "push", status: "completed", conclusion: "success" };
}
function rolloutReport() {
  const report = {
    type: "mse-25.31-network-rollout-report",
    repository: { branch: BRANCH, head: HEAD, dirty: false },
    context: { tenantSlug: "mondescale" },
    proof: {
      preflightCheck: { ok: true },
      ciAttestationCheck: { ok: true, runId: 123 },
      liveCiAttestation: ciAttestation(),
      applyAuthorization: { authorized: true },
      writeIntentCheck: { ok: true },
      executionPlanFingerprint: "b".repeat(64),
      writeIntentFingerprint: "c".repeat(64),
    },
    result: { ok: true, dryRun: false, writes: true, rollbackReady: true, executionPlanFingerprint: "b".repeat(64), writeIntentFingerprint: "c".repeat(64), pagesWritten: 2, rollbackSnapshots: 2 },
    rollbackManifest: [
      { agencyId: 1, siteSlug: "gien", pageSlug: "home", rollbackVersionId: "v-home" },
      { agencyId: 1, siteSlug: "gien", pageSlug: "avis", rollbackVersionId: "v-avis" },
    ],
  };
  report.reportFingerprint = digest({ type: report.type, repository: report.repository, context: report.context, proof: report.proof, result: report.result, rollbackManifest: report.rollbackManifest });
  return report;
}
function writeReport(report) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse2531-rollback-"));
  const file = path.join(dir, "rollout.json");
  fs.writeFileSync(file, JSON.stringify(report), "utf8");
  return file;
}

test("network rollback restores pages in reverse rollout order", async () => {
  const report = rolloutReport();
  const calls = [];
  const service = { async rollback(agencyId, slug, versionId) { calls.push([agencyId, slug, versionId]); } };
  const result = await run({ reportPath: writeReport(report), confirm: true, approvedReportFingerprint: report.reportFingerprint, service, emitOutput: false });
  assert.equal(result.restoredCount, 2);
  assert.deepEqual(calls.map((row) => row[1]), ["avis", "home"]);
});

test("network rollback refuses missing confirmation or substituted report fingerprint", async () => {
  const report = rolloutReport();
  const file = writeReport(report);
  const service = { async rollback() {} };
  await assert.rejects(() => run({ reportPath: file, approvedReportFingerprint: report.reportFingerprint, service, emitOutput: false }), (error) => error.code === "MSE_25_31_ROLLBACK_CONFIRMATION_REQUIRED");
  await assert.rejects(() => run({ reportPath: file, confirm: true, approvedReportFingerprint: "f".repeat(64), service, emitOutput: false }), (error) => error.code === "MSE_25_31_ROLLBACK_REPORT_FINGERPRINT_MISMATCH");
});
