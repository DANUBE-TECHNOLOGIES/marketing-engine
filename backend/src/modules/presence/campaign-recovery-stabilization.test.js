"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateRecoveryStabilization } = require("./campaign-recovery-stabilization");
function qualification(index, classification) { return { eventType:"recovery_qualification", status:classification, payload:{campaignIndex:index}, result:{campaignIndex:index,classification} }; }
function resolution(index, value) { return { eventType:"recovery_manual_resolution", status:value, payload:{campaignIndex:index}, result:{campaignIndex:index,resolution:value} }; }
function verification(index, classification="already_applied") { return { eventType:"recovery_resolution_verification", status:classification==="already_applied"?"verified":"not_verified", payload:{campaignIndex:index}, result:{campaignIndex:index,classification,verified:classification==="already_applied"} }; }

test("already applied recovery qualifications require no manual stabilization",()=>{const state=evaluateRecoveryStabilization([qualification(0,"already_applied")]);assert.equal(state.ready,true);assert.equal(state.requiredCount,0);});
test("resolved_verified requires a successful Google readback",()=>{const blocked=evaluateRecoveryStabilization([qualification(1,"not_applied"),resolution(1,"resolved_verified")]);assert.equal(blocked.ready,false);assert.equal(blocked.verificationRequiredCount,1);assert.ok(blocked.blockers.includes("recovery_manual_resolution_verification_required"));const ready=evaluateRecoveryStabilization([qualification(1,"not_applied"),resolution(1,"resolved_verified"),verification(1)]);assert.equal(ready.ready,true);assert.equal(ready.resolvedCount,1);});
test("accepted manual followup is explicitly out of automation",()=>{const ready=evaluateRecoveryStabilization([qualification(2,"partial_or_changed"),resolution(2,"accepted_manual_followup")]);assert.equal(ready.ready,true);assert.equal(ready.resolvedCount,1);});
test("failed readback keeps recovery blocked",()=>{const state=evaluateRecoveryStabilization([qualification(1,"not_applied"),resolution(1,"resolved_verified"),verification(1,"not_applied")]);assert.equal(state.ready,false);assert.equal(state.verificationRequiredCount,1);});
test("blocking escalation prevents recovery execution",()=>{const state=evaluateRecoveryStabilization([qualification(1,"partial_or_changed"),resolution(1,"escalated_blocking")]);assert.equal(state.ready,false);assert.equal(state.blockingCount,1);assert.ok(state.blockers.includes("recovery_manual_resolution_blocking"));});
