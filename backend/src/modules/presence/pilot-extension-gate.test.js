"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isCanaryCampaign, frozenCanaryNetworkTrustClean } = require("./pilot-extension-gate");
const { frozenPreflightTrustBindingClean } = require("./network-rollout-gate");

function canary(overrides = {}) {
  return {
    campaignId: "canary-1",
    preflightId: "pf-1",
    pilot: true,
    status: "completed",
    approvedScope: { agencyIds: [1], providerKeys: ["google_business_profile"], maxItems: 1, allowSensitive: false, preflightRecoveryTrustFingerprint: "fp-1" },
    ...overrides
  };
}

function frozen(overrides = {}) {
  return { report: { pilotEvidence: { preflightId: "pf-1", preflightRecoveryTrustFingerprint: "fp-1", preflightRecoveryTrustBinding: { ready: true, expected: "fp-1", current: "fp-1" }, networkRecoveryTrust: { critical: 0 }, ...overrides } } };
}

test("completed one-item Google pilot is recognized as canary", () => { assert.equal(isCanaryCampaign(canary()), true); });
test("multi-agency or sensitive campaigns cannot unlock extension", () => {
  assert.equal(isCanaryCampaign(canary({ approvedScope: { agencyIds: [1,2], providerKeys: ["google_business_profile"], maxItems: 1, allowSensitive: false, preflightRecoveryTrustFingerprint: "fp-1" } })), false);
  assert.equal(isCanaryCampaign(canary({ approvedScope: { agencyIds: [1], providerKeys: ["google_business_profile"], maxItems: 1, allowSensitive: true, preflightRecoveryTrustFingerprint: "fp-1" } })), false);
  assert.equal(isCanaryCampaign(canary({ status: "failed" })), false);
});
test("canary frozen proof requires clean network trust and matching preflight binding", () => {
  const campaign = canary();
  assert.equal(frozenCanaryNetworkTrustClean(frozen()), true);
  assert.equal(frozenPreflightTrustBindingClean(campaign, frozen()), true);
  assert.equal(frozenCanaryNetworkTrustClean(frozen({ networkRecoveryTrust: { critical: 1 } })), false);
  assert.equal(frozenPreflightTrustBindingClean(campaign, frozen({ preflightRecoveryTrustBinding: { ready: true, expected: "fp-2", current: "fp-2" }, preflightRecoveryTrustFingerprint: "fp-2" })), false);
  assert.equal(frozenPreflightTrustBindingClean(campaign, { report: { pilotEvidence: { preflightId: "pf-1", networkRecoveryTrust: { critical: 0 } } } }), false);
});
