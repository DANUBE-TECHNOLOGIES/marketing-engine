"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { frozenExecutableItems } = require("./campaign-executor");

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
