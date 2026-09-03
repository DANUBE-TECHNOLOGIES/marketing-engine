"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSearchDemandReviewPrioritization, priorityScore } = require("../src/modules/minisite-semantic-engine/search-demand-review-prioritization");

function queue(items = []) {
  return {
    readOnly: true,
    writes: false,
    queueFingerprint: "queue-1",
    dataState: "DATA_AVAILABLE",
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
    items,
    summary: { executableCount: 0, automaticWriteCount: 0 },
    policy: { humanReviewRequired: true },
  };
}

function lifecycle(signals = []) {
  return { readOnly: true, writes: false, lifecycleFingerprint: "life-1", signals };
}

test("priority uses evidence, impressions and opportunity position without becoming executable", () => {
  const result = buildSearchDemandReviewPrioritization({
    queue: queue([{ key: "gien|ticketing", siteSlug: "gien", intent: "ticketing", reviewReason: "PERSISTENT_SEARCH_DEMAND_EVIDENCE" }]),
    lifecycle: lifecycle([{ siteSlug: "gien", intentKey: "ticketing", evidenceStrength: "high", impressions: 120, clicks: 2, position: 14, qualifyingSnapshotCount: 2 }]),
    generatedAt: "2026-08-25T00:00:00.000Z",
  });
  assert.equal(result.items[0].priorityScore, 100);
  assert.equal(result.items[0].priorityBand, "HIGH_REVIEW_PRIORITY");
  assert.equal(result.items[0].reviewOnly, true);
  assert.equal(result.items[0].executable, false);
  assert.equal(result.summary.automaticWriteCount, 0);
});

test("items are sorted by advisory priority then stable key", () => {
  const result = buildSearchDemandReviewPrioritization({
    queue: queue([
      { key: "b", siteSlug: "b", intent: "stay" },
      { key: "a", siteSlug: "a", intent: "stay" },
    ]),
    lifecycle: lifecycle([
      { siteSlug: "a", intentKey: "stay", evidenceStrength: "medium", impressions: 35, position: 18 },
      { siteSlug: "b", intentKey: "stay", evidenceStrength: "high", impressions: 10, position: 35 },
    ]),
    generatedAt: "2026-08-25T00:00:00.000Z",
  });
  assert.deepEqual(result.items.map((item) => item.key), ["b", "a"]);
});

test("empty certified queue remains a valid empty prioritization", () => {
  const result = buildSearchDemandReviewPrioritization({ queue: queue(), lifecycle: lifecycle(), generatedAt: "2026-08-25T00:00:00.000Z" });
  assert.equal(result.summary.prioritizedReviewItemCount, 0);
  assert.equal(result.summary.executableCount, 0);
});

test("unsafe or executable sources fail closed", () => {
  assert.throws(() => buildSearchDemandReviewPrioritization({ queue: { ...queue(), writes: true }, lifecycle: lifecycle() }), /UNSAFE_REVIEW_QUEUE/);
  assert.throws(() => buildSearchDemandReviewPrioritization({ queue: { ...queue(), summary: { executableCount: 1, automaticWriteCount: 0 } }, lifecycle: lifecycle() }), /EXECUTABLE_SOURCE_FORBIDDEN/);
  assert.throws(() => buildSearchDemandReviewPrioritization({ queue: queue(), lifecycle: { ...lifecycle(), writes: true } }), /UNSAFE_LIFECYCLE/);
});

test("priority score is deterministic", () => {
  const signal = { evidenceStrength: "medium", impressions: 40, clicks: 0, position: 17 };
  assert.equal(priorityScore(signal), priorityScore(signal));
});
