"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {buildRolloutDecisionSnapshot}=require("./network-rollout-decision-snapshot");

test("rollout decision snapshot preserves provenance and blockers",()=>{const snapshot=buildRolloutDecisionSnapshot({ready:false,decision:"no_go",nextStagePercent:50,maxAgencies:5,blockers:["blocked"],stages:[{stagePercent:25,campaignId:"c1",agencyCount:3,reportId:"r1",reportCreatedAt:"2026-08-27T00:00:00Z",provenance:"regenerated_recovery",regenerationOfCampaignId:"legacy",recoveryOfCampaignId:"failed",regenerationReason:"legacy_evidence_incompatible"}]},{ready:true,decision:"go",summary:{total:2,healthy:2,blocked:0,critical:0}});assert.match(snapshot.snapshotId,/^rollout-decision-/);assert.equal(snapshot.decision,"no_go");assert.deepEqual(snapshot.blockers,["blocked"]);assert.equal(snapshot.stages[0].provenance,"regenerated_recovery");assert.equal(snapshot.stages[0].reportId,"r1");assert.equal(snapshot.recoveryTrust.critical,0);});

test("same rollout evidence yields stable snapshot identity",()=>{const gate={ready:true,decision:"go",nextStagePercent:50,maxAgencies:5,blockers:[],stages:[{stagePercent:25,campaignId:"c1",agencyCount:3,reportId:"r1",reportCreatedAt:"2026-08-27T00:00:00Z",provenance:"native"}]};const trust={ready:true,decision:"go",summary:{total:0,healthy:0,blocked:0,critical:0}};assert.equal(buildRolloutDecisionSnapshot(gate,trust).snapshotId,buildRolloutDecisionSnapshot(gate,trust).snapshotId);});
