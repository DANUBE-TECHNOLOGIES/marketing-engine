"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { stageTargetAgencyCount, campaignAgencyCount } = require("./network-rollout-gate");

test("progressive rollout targets ceil of network percentage", () => {
  assert.equal(stageTargetAgencyCount(9, 25), 3);
  assert.equal(stageTargetAgencyCount(9, 50), 5);
  assert.equal(stageTargetAgencyCount(9, 100), 9);
});

test("campaign agency count deduplicates approved scope", () => {
  assert.equal(campaignAgencyCount({ approvedScope: { agencyIds: [1, 2, 2, 3] } }), 3);
});
