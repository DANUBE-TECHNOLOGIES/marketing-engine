const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSearchDemandReviewQueue } = require("../src/modules/minisite-semantic-engine/search-demand-review-queue");

const base = {
  certified: true,
  writes: false,
  automaticWriteCount: 0,
  observationFingerprint: "obs-1",
  dataState: "DATA_AVAILABLE",
  lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
};

test("persistent eligible evidence becomes review-only queue item", () => {
  const result = buildSearchDemandReviewQueue({
    observation: { ...base, signals: [{ key: "gien|ticketing", siteSlug: "gien", intent: "ticketing", humanReviewEligible: true, evidenceLevel: "MEDIUM" }] },
    generatedAt: "2026-08-25T00:00:00.000Z",
  });
  assert.equal(result.summary.reviewItemCount, 1);
  assert.equal(result.items[0].reviewOnly, true);
  assert.equal(result.items[0].executable, false);
  assert.equal(result.summary.automaticWriteCount, 0);
});

test("single snapshot or ineligible signal never enters queue", () => {
  const result = buildSearchDemandReviewQueue({ observation: { ...base, signals: [{ key: "x", humanReviewEligible: false }] } });
  assert.equal(result.summary.reviewItemCount, 0);
});

test("uncertified or writable observations fail closed", () => {
  assert.throws(() => buildSearchDemandReviewQueue({ observation: { ...base, certified: false } }), /UNCERTIFIED/);
  assert.throws(() => buildSearchDemandReviewQueue({ observation: { ...base, writes: true } }), /UNSAFE/);
});

test("queue is deterministic apart from explicit generatedAt", () => {
  const observation = { ...base, signals: [{ key: "b", humanReviewEligible: true }, { key: "a", humanReviewEligible: true }] };
  const a = buildSearchDemandReviewQueue({ observation, generatedAt: "2026-08-25T00:00:00.000Z" });
  const b = buildSearchDemandReviewQueue({ observation, generatedAt: "2026-08-25T00:00:00.000Z" });
  assert.deepEqual(a, b);
  assert.deepEqual(a.items.map((x) => x.key), ["a", "b"]);
});
