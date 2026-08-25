"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { certifyLifecycle } = require("../scripts/mse-25-49-certify");

function baseLifecycle(overrides = {}) {
  return {
    readOnly: true,
    writes: false,
    noDataIsNotNoDemand: true,
    lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA",
    dataState: "NO_DATA_YET",
    policy: {
      automaticWrites: false,
      noAutomaticPageCreation: true,
      noAutomaticContentWrite: true,
      noAutomaticPublication: true,
      noDemandInferenceFromMissingData: true,
      persistentDemandRequiredBeforeHumanReview: true,
      minimumConsecutiveQualifyingSnapshots: 2,
      singleSnapshotSpikeIsInsufficient: true,
    },
    summary: {
      humanReviewEligibleCount: 0,
      automaticWriteCount: 0,
    },
    ...overrides,
  };
}

test("waiting-for-data lifecycle is certifiable without inferring no demand", () => {
  const result = certifyLifecycle(baseLifecycle());
  assert.equal(result.certified, true);
  assert.equal(result.waitingForData, true);
  assert.equal(result.noDataSemanticsSafe, true);
});

test("active lifecycle is certifiable only with persistence gate", () => {
  const result = certifyLifecycle(baseLifecycle({
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
    dataState: "DATA_AVAILABLE",
    summary: { humanReviewEligibleCount: 2, automaticWriteCount: 0 },
  }));
  assert.equal(result.certified, true);
  assert.equal(result.lifecycleActive, true);
  assert.equal(result.reviewGateSafe, true);
});

test("automatic writes fail certification", () => {
  const lifecycle = baseLifecycle({
    writes: true,
    policy: { ...baseLifecycle().policy, automaticWrites: true },
    summary: { humanReviewEligibleCount: 0, automaticWriteCount: 1 },
  });
  assert.equal(certifyLifecycle(lifecycle).certified, false);
});

test("single-snapshot active review policy fails certification", () => {
  const lifecycle = baseLifecycle({
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
    dataState: "DATA_AVAILABLE",
    policy: { ...baseLifecycle().policy, minimumConsecutiveQualifyingSnapshots: 1 },
  });
  assert.equal(certifyLifecycle(lifecycle).certified, false);
});
