"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isRecoveryCampaign, trustSeverity } = require("./recovery-trust-overview");

test("recovery trust overview identifies only recovery campaigns", () => {
  assert.equal(isRecoveryCampaign({ approvedScope: { recoveryOfCampaignId: "c1" } }), true);
  assert.equal(isRecoveryCampaign({ approvedScope: {} }), false);
});

test("recovery trust severity escalates stale and structural blockers", () => {
  assert.equal(trustSeverity({ ready: true, blockers: [] }), "ok");
  assert.equal(trustSeverity({ ready: false, blockers: ["recovery_stabilization_snapshot_stale"] }), "critical");
  assert.equal(trustSeverity({ ready: false, blockers: ["recovery_trust_chain_binding_missing"] }), "warning");
});
