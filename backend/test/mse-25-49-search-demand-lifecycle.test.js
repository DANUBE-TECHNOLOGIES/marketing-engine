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

test("new medium evidence becomes human-review eligible without automatic write", () => {
  const result = buildSearchDemandLifecycle({ previous: evidence({ strength: "none" }), current: evidence({ strength: "medium", impressions: 40 }) });
  assert.equal(result.signals[0].transition, "NEW");
  assert.equal(result.signals[0].humanReviewEligible, true);
  assert.equal(result.signals[0].automaticWrite, false);
});

test("persisting evidence is distinguished from newly observed demand", () => {
  const result = buildSearchDemandLifecycle({ previous: evidence({ strength: "medium", impressions: 40 }), current: evidence({ strength: "high", impressions: 120 }) });
  assert.equal(result.signals[0].transition, "PERSISTING");
  assert.equal(result.summary.persistingCount, 1);
});

test("disappeared evidence is observed but never converted into an automatic remediation", () => {
  const result = buildSearchDemandLifecycle({ previous: evidence({ strength: "high", impressions: 120 }), current: evidence({ strength: "none" }) });
  assert.equal(result.signals[0].transition, "DISAPPEARED");
  assert.equal(result.signals[0].humanReviewEligible, false);
  assert.equal(result.policy.automaticWrites, false);
});

test("lifecycle is deterministic", () => {
  const input = { previous: evidence({ strength: "none" }), current: evidence({ strength: "medium", impressions: 40 }) };
  assert.deepEqual(buildSearchDemandLifecycle(input), buildSearchDemandLifecycle(input));
});
