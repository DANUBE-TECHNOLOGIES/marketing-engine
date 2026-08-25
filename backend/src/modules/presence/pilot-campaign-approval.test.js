"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { scopeMatchesPlan, normalizedScope } = require("./pilot-campaign-approval");

function campaign(overrides = {}) {
  return {
    pilot: true,
    preflightId: "preflight-123",
    approvedScope: { agencyIds: [2, 1], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false },
    policy: { agencyIds: [1, 2], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false },
    plan: { policy: { agencyIds: [1, 2], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false } },
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
