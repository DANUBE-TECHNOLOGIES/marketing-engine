"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { assertRolloutReport, digest } = require("../scripts/mse-25-31-rollout-report-check");
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
  return {
    ok: true,
    repository: GITHUB_REPOSITORY,
    workflowId: GITHUB_WORKFLOW_ID,
    workflowName: GITHUB_WORKFLOW_NAME,
    workflowPath: GITHUB_WORKFLOW_PATH,
    workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA,
    runId: 123,
    headSha: HEAD,
    headBranch: BRANCH,
    event: "push",
    status: "completed",
    conclusion: "success",
  };
}

function report({ writes = true } = {}) {
  const value = {
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
    result: writes ? {
      ok: true, dryRun: false, writes: true, rollbackReady: true,
      executionPlanFingerprint: "b".repeat(64), writeIntentFingerprint: "c".repeat(64),
      pagesWritten: 1, rollbackSnapshots: 1,
    } : {
      ok: true, dryRun: true, writes: false,
      executionPlanFingerprint: "b".repeat(64), writeIntentFingerprint: "c".repeat(64),
      pagesWritten: 0, rollbackSnapshots: 0,
    },
    rollbackManifest: writes ? [{ agencyId: 1, siteSlug: "gien", pageSlug: "home", rollbackVersionId: "v1" }] : [],
  };
  value.reportFingerprint = digest({ type: value.type, repository: value.repository, context: value.context, proof: value.proof, result: value.result, rollbackManifest: value.rollbackManifest });
  return value;
}

test("rollout report check accepts a complete versioned rollout with CI evidence", () => {
  const result = assertRolloutReport(report());
  assert.equal(result.ok, true);
  assert.equal(result.ciRunId, 123);
  assert.equal(result.pagesWritten, 1);
  assert.equal(result.rollbackSnapshots, 1);
});

test("rollout report check accepts a pure dry-run without rollback entries", () => {
  const result = assertRolloutReport(report({ writes: false }));
  assert.equal(result.dryRun, true);
  assert.equal(result.writes, false);
});

test("rollout report check rejects substituted report content", () => {
  const value = report();
  value.rollbackManifest[0].pageSlug = "avis";
  assert.throws(() => assertRolloutReport(value), (error) => error.code === "MSE_25_31_ROLLOUT_REPORT_INVALID");
});

test("rollout report check rejects missing or substituted CI evidence", () => {
  const missing = report();
  missing.proof.ciAttestationCheck = null;
  missing.reportFingerprint = digest({ type: missing.type, repository: missing.repository, context: missing.context, proof: missing.proof, result: missing.result, rollbackManifest: missing.rollbackManifest });
  assert.throws(() => assertRolloutReport(missing), (error) => error.code === "MSE_25_31_ROLLOUT_REPORT_INVALID");

  const substituted = report();
  substituted.proof.liveCiAttestation.headSha = "f".repeat(40);
  substituted.reportFingerprint = digest({ type: substituted.type, repository: substituted.repository, context: substituted.context, proof: substituted.proof, result: substituted.result, rollbackManifest: substituted.rollbackManifest });
  assert.throws(() => assertRolloutReport(substituted), (error) => error.code === "MSE_25_31_ROLLOUT_REPORT_INVALID");
});

test("rollout report check rejects writes without a complete rollback manifest", () => {
  const value = report();
  value.rollbackManifest = [];
  value.reportFingerprint = digest({ type: value.type, repository: value.repository, context: value.context, proof: value.proof, result: value.result, rollbackManifest: value.rollbackManifest });
  assert.throws(() => assertRolloutReport(value), (error) => {
    assert.equal(error.code, "MSE_25_31_ROLLOUT_REPORT_INVALID");
    assert.ok(error.details.issues.some((issue) => issue.code === "rollback-manifest-count-mismatch"));
    return true;
  });
});
