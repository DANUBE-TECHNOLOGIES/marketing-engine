"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSearchDemandLifecycle } = require("../src/modules/minisite-semantic-engine/search-demand-lifecycle");

function evidence({ available = true, strength = "none", impressions = 0 } = {}) {
  return {
    evidenceFingerprint: `fp-${available}-${strength}-${impressions}`,
    readOnly: true,
    writes: false,
    analyticsAvailable: available,
    dataState: available ? "DATA_AVAILABLE" : "NO_DATA_YET",
    policy: { automaticWrites: false },
    signals: [{ siteSlug: "mondescale-test", agencyId: "a1", city: "Test", intentKey: "circuits", evidenceStrength: strength, impressions, clicks: 0, position: impressions ? 18 : 0 }],
  };
}

test("no Search Console rows remain unknown and never mean no demand", () => {
  const result = buildSearchDemandLifecycle({ current: evidence({ available: false }) });
  assert.equal(result.lifecycleState, "WAITING_FOR_SEARCH_DEMAND_DATA");
  assert.equal(result.signals[0].transition, "UNKNOWN_NO_DATA");
  assert.equal(result.summary.unknownNoDataCount, 1);
  assert.equal(result.summary.humanReviewEligibleCount, 0);
  assert.equal(result.summary.automaticWriteCount, 0);
});

test("a new medium signal is observed but a single snapshot spike is not review eligible", () => {
  const result = buildSearchDemandLifecycle({ previous: evidence({ strength: "none" }), current: evidence({ strength: "medium", impressions: 40 }) });
  assert.equal(result.signals[0].transition, "NEW");
  assert.equal(result.signals[0].qualifyingSnapshotCount, 1);
  assert.equal(result.signals[0].persistentReviewEvidence, false);
  assert.equal(result.signals[0].humanReviewEligible, false);
  assert.equal(result.policy.singleSnapshotSpikeIsInsufficient, true);
  assert.equal(result.signals[0].automaticWrite, false);
});

test("two consecutive medium or high snapshots become human-review eligible", () => {
  const result = buildSearchDemandLifecycle({ previous: evidence({ strength: "medium", impressions: 40 }), current: evidence({ strength: "high", impressions: 120 }) });
  assert.equal(result.signals[0].transition, "PERSISTING");
  assert.equal(result.signals[0].qualifyingSnapshotCount, 2);
  assert.equal(result.signals[0].persistentReviewEvidence, true);
  assert.equal(result.signals[0].humanReviewEligible, true);
  assert.equal(result.summary.persistingCount, 1);
  assert.equal(result.summary.persistentReviewEvidenceCount, 1);
});

test("weak then medium is persisting demand but still lacks two qualifying snapshots", () => {
  const result = buildSearchDemandLifecycle({ previous: evidence({ strength: "weak", impressions: 12 }), current: evidence({ strength: "medium", impressions: 40 }) });
  assert.equal(result.signals[0].transition, "PERSISTING");
  assert.equal(result.signals[0].qualifyingSnapshotCount, 1);
  assert.equal(result.signals[0].humanReviewEligible, false);
});

test("disappeared evidence is observed but never converted into an automatic remediation", () => {
  const result = buildSearchDemandLifecycle({ previous: evidence({ strength: "high", impressions: 120 }), current: evidence({ strength: "none" }) });
  assert.equal(result.signals[0].transition, "DISAPPEARED");
  assert.equal(result.signals[0].qualifyingSnapshotCount, 0);
  assert.equal(result.signals[0].humanReviewEligible, false);
  assert.equal(result.policy.automaticWrites, false);
});

test("lifecycle policy seals two qualifying snapshots and remains deterministic", () => {
  const input = { previous: evidence({ strength: "medium", impressions: 40 }), current: evidence({ strength: "medium", impressions: 45 }) };
  const first = buildSearchDemandLifecycle(input);
  const second = buildSearchDemandLifecycle(input);
  assert.equal(first.policy.minimumConsecutiveQualifyingSnapshots, 2);
  assert.deepEqual(first, second);
});
