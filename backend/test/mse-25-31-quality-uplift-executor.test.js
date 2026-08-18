"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { executeQualityUpliftWriteIntent } = require("../src/modules/minisite-seo-enrichment/quality-uplift-executor");

const FP = "a".repeat(64);
function intent(pageSlug) {
  return {
    key: `gien:${pageSlug}`,
    agencyId: 1,
    siteSlug: "gien",
    pageSlug,
    persistence: {
      agencyId: 1,
      pageSlug,
      body: { page: { title: pageSlug, slug: pageSlug, status: "published", seoTitle: "", metaDescription: "", published: true }, blocks: [] },
    },
  };
}
function writeIntent(intents) {
  return { version: "mse-25.31", operation: "quality-uplift-write-intent", readOnly: true, writes: false, publicWrites: false, executionPlanFingerprint: "b".repeat(64), writeIntentFingerprint: FP, intents };
}
function fakeService({ failApplyOn } = {}) {
  const calls = [];
  const saveCounts = new Map();
  return {
    calls,
    async get(agencyId, slug) { calls.push(["get", agencyId, slug]); return { title: slug, slug, status: "published", published: true, blocks: [] }; },
    async save(agencyId, slug, body, metadata) {
      calls.push(["save", agencyId, slug, metadata.reason]);
      const count = (saveCounts.get(slug) || 0) + 1; saveCounts.set(slug, count);
      if (slug === failApplyOn && count === 2) throw Object.assign(new Error("boom"), { code: "SAVE_FAILED" });
      return { slug };
    },
    async versions(agencyId, slug) { calls.push(["versions", agencyId, slug]); return { items: [{ id: `v-${slug}`, version: 7 }] }; },
    async rollback(agencyId, slug, versionId) { calls.push(["rollback", agencyId, slug, versionId]); return { slug }; },
  };
}

test("executor dry-run performs zero persistence calls", async () => {
  const service = fakeService();
  const result = await executeQualityUpliftWriteIntent({ writeIntent: writeIntent([intent("home")]), service, dryRun: true, approvedWriteIntentFingerprint: FP });
  assert.equal(result.dryRun, true);
  assert.equal(result.pagesWritten, 0);
  assert.deepEqual(service.calls, []);
});

test("executor creates rollback snapshots before versioned writes", async () => {
  const service = fakeService();
  const result = await executeQualityUpliftWriteIntent({ writeIntent: writeIntent([intent("home")]), service, dryRun: false, confirm: true, approvedWriteIntentFingerprint: FP });
  assert.equal(result.pagesWritten, 1);
  assert.equal(result.rollbackSnapshots, 1);
  assert.equal(result.rollbackReady, true);
  assert.deepEqual(service.calls.map((row) => row[0]), ["get", "save", "versions", "save"]);
  assert.equal(result.rollbackManifest[0].rollbackVersionId, "v-home");
});

test("executor compensates already applied pages when a later write fails", async () => {
  const service = fakeService({ failApplyOn: "avis" });
  await assert.rejects(
    () => executeQualityUpliftWriteIntent({ writeIntent: writeIntent([intent("home"), intent("avis")]), service, dryRun: false, confirm: true, approvedWriteIntentFingerprint: FP }),
    (error) => {
      assert.equal(error.code, "MSE_25_31_EXECUTION_COMPENSATED");
      assert.equal(error.details.pagesWrittenBeforeFailure, 1);
      assert.equal(error.details.compensatedCount, 1);
      return true;
    }
  );
  assert.ok(service.calls.some((row) => row[0] === "rollback" && row[2] === "home"));
});

test("executor refuses a real write without confirmation or exact fingerprint", async () => {
  const service = fakeService();
  await assert.rejects(() => executeQualityUpliftWriteIntent({ writeIntent: writeIntent([intent("home")]), service, dryRun: false, approvedWriteIntentFingerprint: FP }), (error) => error.code === "MSE_25_31_EXECUTOR_CONFIRMATION_REQUIRED");
  await assert.rejects(() => executeQualityUpliftWriteIntent({ writeIntent: writeIntent([intent("home")]), service, dryRun: false, confirm: true, approvedWriteIntentFingerprint: "f".repeat(64) }), (error) => error.code === "MSE_25_31_EXECUTOR_FINGERPRINT_MISMATCH");
});
