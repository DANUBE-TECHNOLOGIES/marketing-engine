"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const{evaluateRolloutDecisionFreezePolicy}=require("./rollout-decision-freeze-policy");

test("non critical rollout freeze needs no operator reason",()=>{const policy=evaluateRolloutDecisionFreezePolicy({severity:"warning"},"");assert.equal(policy.ready,true);assert.equal(policy.acknowledgementRequired,false);});
test("critical rollout drift requires explicit operator reason",()=>{const policy=evaluateRolloutDecisionFreezePolicy({severity:"critical"},"court");assert.equal(policy.ready,false);assert.ok(policy.blockers.includes("critical_rollout_ack_reason_required"));});
test("critical rollout drift accepts and preserves explicit reason",()=>{const reason="Recovery critique analysée et décision NO-GO reconnue";const policy=evaluateRolloutDecisionFreezePolicy({severity:"critical"},reason);assert.equal(policy.ready,true);assert.equal(policy.acknowledgementRequired,true);assert.equal(policy.acknowledgementReason,reason);assert.equal(policy.acknowledgementSeverity,"critical");});
