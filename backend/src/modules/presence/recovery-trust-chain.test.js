"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const { evaluateRecoveryTrustChain }=require("./recovery-trust-chain");

function prismaFixture({stale=false,cycle=false}={}){
  const campaigns={
    "r1":{campaignId:"r1",approvedScope:{recoveryOfCampaignId:"r0",recoveryStabilizationSnapshotId:"s0",recoveryStabilizationEvidenceSignature:"sig0"}},
    "r0":cycle?{campaignId:"r0",approvedScope:{recoveryOfCampaignId:"r1",recoveryStabilizationSnapshotId:"s1",recoveryStabilizationEvidenceSignature:"sig1"}}:{campaignId:"r0",approvedScope:{}}
  };
  return {
    $queryRaw: async (strings,...values)=>{
      const sql=String.raw({raw:strings},...values);
      const source=values[0];
      if(sql.includes("recovery_stabilization_snapshot")) return [{id:1,result:{snapshotId:source==="r0"?"s0":"s1",evidenceSignature:source==="r0"?(stale?"other":"sig0"):"sig1"},createdAt:new Date()}];
      if(sql.includes("eventType\" IN")) return [{id:1,eventType:"recovery_qualification",status:"already_applied",payload:{campaignIndex:0},result:{campaignIndex:0,classification:"already_applied"},createdAt:new Date()}];
      if(sql.includes("FROM \"PresenceCampaign\"")) return campaigns[source]?[campaigns[source]]:[];
      return [];
    }
  };
}

test("recursive recovery trust chain is GO when every ancestor binding is intact",async()=>{const gate=await evaluateRecoveryTrustChain(prismaFixture(),{campaignId:"r1",approvedScope:{recoveryOfCampaignId:"r0",recoveryStabilizationSnapshotId:"s0",recoveryStabilizationEvidenceSignature:"sig0"}});assert.equal(gate.ready,true);assert.equal(gate.depth,1);});
test("recursive recovery trust chain rejects stale ancestor evidence",async()=>{const gate=await evaluateRecoveryTrustChain(prismaFixture({stale:true}),{campaignId:"r1",approvedScope:{recoveryOfCampaignId:"r0",recoveryStabilizationSnapshotId:"s0",recoveryStabilizationEvidenceSignature:"sig0"}});assert.equal(gate.ready,false);assert.ok(gate.blockers.length>0);});
