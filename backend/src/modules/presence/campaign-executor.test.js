"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { frozenExecutableItems, approvedExecutionLimit, shouldPilotFailFast } = require("./campaign-executor");

test("campaign executor only reads persisted executable items", () => {
  const campaign = {
    plan: {
      executable: [
        { agencyId: 1, providerKey: "google_business_profile", drift: ["phone"], remediationKind: "managed_api" },
        { agencyId: 2, providerKey: "google_business_profile", drift: ["website"], remediationKind: "managed_api" }
      ],
      selected: [{ agencyId: 99, providerKey: "pagesjaunes" }]
    }
  };
  const items = frozenExecutableItems(campaign);
  assert.equal(items.length, 2);
  assert.equal(items[0].agencyId, 1);
  assert.equal(items[1].campaignIndex, 1);
  assert.equal(items.some((item) => item.agencyId === 99), false);
});

test("campaign executor returns empty list when frozen executable plan is absent", () => {
  assert.deepEqual(frozenExecutableItems({ plan: {} }), []);
});

test("execution limit can never exceed approved campaign scope", () => {
  const campaign = { approvedScope: { maxItems: 3 }, plan: { policy: { maxItems: 10 } } };
  assert.equal(approvedExecutionLimit(campaign, 100), 3);
  assert.equal(approvedExecutionLimit(campaign, 2), 2);
});

test("pilot campaigns fail fast on any unsafe execution outcome", () => {
  const pilot = { pilot: true };
  assert.equal(shouldPilotFailFast(pilot, { status: "failed" }), true);
  assert.equal(shouldPilotFailFast(pilot, { status: "blocked_sensitive" }), true);
  assert.equal(shouldPilotFailFast(pilot, { status: "skipped" }), true);
  assert.equal(shouldPilotFailFast(pilot, { status: "submitted" }), false);
  assert.equal(shouldPilotFailFast({ pilot: false }, { status: "failed" }), false);
});
