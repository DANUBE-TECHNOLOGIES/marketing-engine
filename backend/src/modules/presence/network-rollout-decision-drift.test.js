"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const{compareRolloutDecision}=require("./network-rollout-decision-drift");
function snap(overrides={}){return{snapshotId:"s1",ready:true,decision:"go",nextStagePercent:50,maxAgencies:5,blockers:[],stages:[{stagePercent:25,campaignId:"c1",reportId:"r1",provenance:"native"}],recoveryTrust:{critical:0},...overrides};}
test("missing frozen baseline is informational",()=>{const drift=compareRolloutDecision(snap(),null);assert.equal(drift.changed,false);assert.equal(drift.baselineMissing,true);assert.equal(drift.severity,"info");});
test("identical decision has no drift",()=>{const current=snap({snapshotId:"current"}),previous=snap({snapshotId:"previous"});const drift=compareRolloutDecision(current,previous);assert.equal(drift.changed,false);assert.equal(drift.severity,"none");});
test("GO to NO-GO is critical drift",()=>{const drift=compareRolloutDecision(snap({snapshotId:"current",ready:false,decision:"no_go",nextStagePercent:null,maxAgencies:0,blockers:["critical_recovery_trust_blocks_rollout"],recoveryTrust:{critical:1}}),snap({snapshotId:"previous"}));assert.equal(drift.changed,true);assert.equal(drift.severity,"critical");assert.ok(drift.changes.some(x=>x.type==="decision"));assert.ok(drift.changes.some(x=>x.type==="critical_recovery"));});
test("evidence provenance change is reported",()=>{const drift=compareRolloutDecision(snap({stages:[{stagePercent:25,campaignId:"c2",reportId:"r2",provenance:"regenerated",regenerationOfCampaignId:"legacy"}]}),snap());assert.equal(drift.changed,true);assert.equal(drift.severity,"warning");assert.ok(drift.changes.some(x=>x.type==="evidence_provenance"));});
