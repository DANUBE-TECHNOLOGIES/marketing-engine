"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {evaluateRolloutDecisionAcknowledgement,hasGovernancePolicyDrift}=require("./rollout-decision-ack-gate");
const {buildRolloutDecisionSnapshot}=require("./network-rollout-decision-snapshot");

function prismaWith(...snapshots){return{$queryRaw:async()=>snapshots.filter(Boolean).map((previous,index)=>({id:index+1,status:previous.decision,result:previous,createdAt:new Date(`2026-08-27T0${8-index}:00:00Z`)}))};}
function gate(){return{ready:true,decision:"go",nextStagePercent:50,maxAgencies:5,blockers:[],stages:[],recoveryTrust:{ready:true,decision:"go",summary:{total:0,healthy:0,blocked:0,critical:0}}};}
function withThreshold(value,fn){const previous=process.env.PRESENCE_ACK_SEALING_MIN_PERCENT;process.env.PRESENCE_ACK_SEALING_MIN_PERCENT=String(value);return Promise.resolve().then(fn).finally(()=>{if(previous===undefined)delete process.env.PRESENCE_ACK_SEALING_MIN_PERCENT;else process.env.PRESENCE_ACK_SEALING_MIN_PERCENT=previous;});}

test("critical governance tightening blocks promotion until frozen",async()=>withThreshold(80,async()=>{const currentGate=gate();const previous={...buildRolloutDecisionSnapshot(currentGate,currentGate.recoveryTrust),snapshotId:"rollout-decision-before",governancePolicy:{acknowledgementSealingMinPercent:0,version:1}};const result=await evaluateRolloutDecisionAcknowledgement(prismaWith(previous),currentGate);assert.equal(result.ready,false);assert.equal(result.governancePolicyDrift,true);assert.equal(result.drift.severity,"critical");assert.ok(result.blockers.includes("critical_rollout_decision_drift_unacknowledged"));assert.ok(result.blockers.includes("critical_rollout_governance_policy_drift_unacknowledged"));}));

test("governance relaxation remains warning and does not add critical governance blocker",async()=>withThreshold(20,async()=>{const currentGate=gate();const previous={...buildRolloutDecisionSnapshot(currentGate,currentGate.recoveryTrust),snapshotId:"rollout-decision-before",governancePolicy:{acknowledgementSealingMinPercent:80,version:1}};const result=await evaluateRolloutDecisionAcknowledgement(prismaWith(previous),currentGate);assert.equal(result.drift.severity,"warning");assert.equal(result.governancePolicyDrift,true);assert.ok(!result.blockers.includes("critical_rollout_governance_policy_drift_unacknowledged"));}));

test("frozen current governance clears governance drift blocker",async()=>withThreshold(80,async()=>{const currentGate=gate();const frozen=buildRolloutDecisionSnapshot(currentGate,currentGate.recoveryTrust);const result=await evaluateRolloutDecisionAcknowledgement(prismaWith(frozen),currentGate);assert.equal(result.drift.changed,false);assert.equal(result.governancePolicyDrift,false);assert.ok(!result.blockers.includes("critical_rollout_governance_policy_drift_unacknowledged"));}));

test("governance drift helper only matches governance changes",()=>{assert.equal(hasGovernancePolicyDrift({changes:[{type:"governance_policy"}]}),true);assert.equal(hasGovernancePolicyDrift({changes:[{type:"decision"}]}),false);});
