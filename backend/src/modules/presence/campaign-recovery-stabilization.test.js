"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateRecoveryStabilization } = require("./campaign-recovery-stabilization");

function qualification(index, classification) { return { eventType: "recovery_qualification", status: classification, payload: { campaignIndex: index }, result: { campaignIndex: index, classification } }; }
function resolution(index, value) { return { eventType: "recovery_manual_resolution", status: value, payload: { campaignIndex: index }, result: { campaignIndex: index, resolution: value } }; }

test("already applied recovery qualifications require no manual stabilization", () => {
  const state = evaluateRecoveryStabilization([qualification(0, "already_applied")]);
  assert.equal(state.ready, true);
  assert.equal(state.requiredCount, 0);
});

test("not applied or partial recovery items block until manually resolved", () => {
  const blocked = evaluateRecoveryStabilization([qualification(1, "not_applied"), qualification(2, "partial_or_changed")]);
  assert.equal(blocked.ready, false);
  assert.equal(blocked.unresolvedCount, 2);
  assert.ok(blocked.blockers.includes("recovery_manual_resolution_required"));
  const ready = evaluateRecoveryStabilization([qualification(1, "not_applied"), resolution(1, "resolved_verified"), qualification(2, "partial_or_changed"), resolution(2, "accepted_manual_followup")]);
  assert.equal(ready.ready, true);
  assert.equal(ready.resolvedCount, 2);
});

test("blocking escalation prevents recovery execution", () => {
  const state = evaluateRecoveryStabilization([qualification(1, "partial_or_changed"), resolution(1, "escalated_blocking")]);
  assert.equal(state.ready, false);
  assert.equal(state.blockingCount, 1);
  assert.ok(state.blockers.includes("recovery_manual_resolution_blocking"));
});
