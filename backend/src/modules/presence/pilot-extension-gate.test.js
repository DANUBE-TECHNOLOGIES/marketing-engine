"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isCanaryCampaign } = require("./pilot-extension-gate");

function canary(overrides = {}) {
  return {
    pilot: true,
    status: "completed",
    approvedScope: { agencyIds: [1], providerKeys: ["google_business_profile"], maxItems: 1, allowSensitive: false },
    ...overrides
  };
}

test("completed one-item Google pilot is recognized as canary", () => {
  assert.equal(isCanaryCampaign(canary()), true);
});

test("multi-agency or sensitive campaigns cannot unlock extension", () => {
  assert.equal(isCanaryCampaign(canary({ approvedScope: { agencyIds: [1,2], providerKeys: ["google_business_profile"], maxItems: 1, allowSensitive: false } })), false);
  assert.equal(isCanaryCampaign(canary({ approvedScope: { agencyIds: [1], providerKeys: ["google_business_profile"], maxItems: 1, allowSensitive: true } })), false);
  assert.equal(isCanaryCampaign(canary({ status: "failed" })), false);
});
