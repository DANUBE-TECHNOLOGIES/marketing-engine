"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { regenerationMode, regenerationReason } = require("./campaign-regeneration-routes");

test("legacy regeneration preserves canary extended and rollout mode", () => {
  assert.deepEqual(regenerationMode({ approvedScope: { agencyIds: [1] } }), { rolloutStage: null, extended: false, agencyIds: [1] });
  assert.deepEqual(regenerationMode({ approvedScope: { agencyIds: [1,2,3] } }), { rolloutStage: null, extended: true, agencyIds: [1,2,3] });
  assert.deepEqual(regenerationMode({ approvedScope: { agencyIds: [1,2,3,4,5], rolloutStage: 50 } }), { rolloutStage: 50, extended: false, agencyIds: [1,2,3,4,5] });
});

test("regeneration reason records legacy versus inconsistent evidence", () => {
  assert.equal(regenerationReason({ legacy: true }), "legacy_evidence_incompatible");
  assert.equal(regenerationReason({ legacy: false }), "evidence_inconsistent");
});
