"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSearchDemandHistory } = require("../src/modules/minisite-semantic-engine/search-demand-history");

function observation(overrides = {}) {
  return {
    generatedAt: "2026-08-25T10:00:00.000Z",
    observationFingerprint: "obs-1",
    analyticsFingerprint: "analytics-1",
    lifecycleFingerprint: "lifecycle-1",
    property: "sc-domain:mondescale.com",
    analyticsRowCount: 0,
    dataState: "NO_DATA_YET",
    lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA",
    readOnly: true,
    writes: false,
    certified: true,
    summary: { humanReviewEligibleCount: 0, automaticWriteCount: 0 },
    ...overrides,
  };
}

test("history keeps certified read-only observations in chronological order", () => {
  const history = buildSearchDemandHistory({ observations: [
    observation({ generatedAt: "2026-08-26T10:00:00.000Z", observationFingerprint: "obs-2" }),
    observation(),
  ] });
  assert.equal(history.snapshotCount, 2);
  assert.equal(history.snapshots[0].observationFingerprint, "obs-1");
  assert.equal(history.latest.observationFingerprint, "obs-2");
  assert.equal(history.writes, false);
});

test("history excludes uncertified or write-capable observations", () => {
  const history = buildSearchDemandHistory({ observations: [
    observation(),
    observation({ observationFingerprint: "unsafe", writes: true }),
    observation({ observationFingerprint: "uncertified", certified: false }),
  ] });
  assert.equal(history.snapshotCount, 1);
  assert.equal(history.latest.observationFingerprint, "obs-1");
});

test("history reports meaningful deltas without creating an action", () => {
  const history = buildSearchDemandHistory({ observations: [
    observation(),
    observation({
      generatedAt: "2026-09-01T10:00:00.000Z",
      observationFingerprint: "obs-2",
      analyticsRowCount: 12,
      dataState: "DATA_AVAILABLE",
      lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
      summary: { humanReviewEligibleCount: 2, automaticWriteCount: 0 },
    }),
  ] });
  assert.deepEqual(history.change, {
    dataStateChanged: true,
    lifecycleStateChanged: true,
    analyticsRowDelta: 12,
    humanReviewEligibleDelta: 2,
  });
  assert.equal(history.policy.automaticWrites, false);
  assert.equal(history.latest.automaticWriteCount, 0);
});

test("history fingerprint is deterministic", () => {
  const input = { observations: [observation()] };
  assert.equal(buildSearchDemandHistory(input).historyFingerprint, buildSearchDemandHistory(input).historyFingerprint);
});
