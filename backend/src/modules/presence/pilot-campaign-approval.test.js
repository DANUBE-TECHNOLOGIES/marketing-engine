"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { scopeMatchesPlan, normalizedScope, approvedFingerprintMatches } = require("./pilot-campaign-approval");
const { stableId } = require("./campaign-planner");

function campaign(overrides = {}) {
  const approvedScope = { agencyIds: [2, 1], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false, rolloutStage: 50, sourceEvidenceCampaignId: "presence-source" };
  const plan = { policy: { agencyIds: [1, 2], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false }, selected: [{ agencyId: 1, drift: ["phone"] }] };
  return {
    pilot: true,
    preflightId: "preflight-123",
    approvedScope,
    policy: plan.policy,
    plan,
    approvedPlanFingerprint: stableId({ approvedScope, selected: plan.selected }),
    ...overrides
  };
}

test("pilot campaign scope matches equivalent persisted plan regardless of ordering", () => {
  assert.equal(scopeMatchesPlan(campaign()), true);
  assert.deepEqual(normalizedScope(campaign()).agencyIds, [1, 2]);
});

test("pilot campaign scope mismatch is detected before approval or run", () => {
  assert.equal(scopeMatchesPlan(campaign({ approvedScope: { agencyIds: [1, 3], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false } })), false);
  assert.equal(scopeMatchesPlan(campaign({ approvedScope: { agencyIds: [1, 2], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: true } })), false);
});

test("approved fingerprint protects rollout stage and predecessor evidence", () => {
  const original = campaign();
  assert.equal(approvedFingerprintMatches(original), true);
  assert.equal(approvedFingerprintMatches({ ...original, approvedScope: { ...original.approvedScope, rolloutStage: 100 } }), false);
  assert.equal(approvedFingerprintMatches({ ...original, approvedScope: { ...original.approvedScope, sourceEvidenceCampaignId: "other-source" } }), false);
});
