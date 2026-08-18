"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { assertRolloutReport, digest } = require("../scripts/mse-25-31-rollout-report-check");

function report({ writes = true } = {}) {
  const value = {
    type: "mse-25.31-network-rollout-report",
    repository: { branch: "feature/mse-25-31-local-seo-quality-uplift", head: "a".repeat(40), dirty: false },
    context: { tenantSlug: "mondescale" },
    proof: {
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

test("rollout report check accepts a complete versioned rollout", () => {
  const result = assertRolloutReport(report());
  assert.equal(result.ok, true);
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
