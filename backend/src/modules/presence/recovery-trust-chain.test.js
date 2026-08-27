"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const { evaluateRecoveryTrustChain }=require("./recovery-trust-chain");
const { evidenceSignature }=require("./campaign-recovery-stabilization-snapshot");

function fixtureEvidence(){return [{id:1,eventType:"recovery_qualification",status:"already_applied",operationId:null,agencyId:null,payload:{campaignIndex:0},result:{campaignIndex:0,classification:"already_applied"},createdAt:new Date("2026-08-26T08:00:00.000Z")}];}
function prismaFixture({stale=false,cycle=false}={}){
  const evidence=fixtureEvidence();
  const sig=evidenceSignature(evidence);
  const campaigns={
    "r1":{campaignId:"r1",approvedScope:{recoveryOfCampaignId:"r0",recoveryStabilizationSnapshotId:`recovery-stabilization-${sig}`,recoveryStabilizationEvidenceSignature:sig}},
    "r0":cycle?{campaignId:"r0",approvedScope:{recoveryOfCampaignId:"r1",recoveryStabilizationSnapshotId:`recovery-stabilization-${sig}`,recoveryStabilizationEvidenceSignature:sig}}:{campaignId:"r0",approvedScope:{}}
  };
  return {
    expectedSignature:sig,
    prisma:{
      $queryRaw:async(strings,...values)=>{
        const sql=String.raw({raw:strings},...values);const source=values[0];
        if(sql.includes("recovery_stabilization_snapshot"))return[{id:1,result:{snapshotId:`recovery-stabilization-${sig}`,evidenceSignature:stale?"stale-signature":sig},createdAt:new Date("2026-08-26T08:01:00.000Z")}];
        if(sql.includes("eventType\" IN"))return evidence;
        if(sql.includes("FROM \"PresenceCampaign\""))return campaigns[source]?[campaigns[source]]:[];
        return[];
      }
    },campaigns
  };
}

test("recursive recovery trust chain is GO when every ancestor binding is intact",async()=>{const f=prismaFixture();const gate=await evaluateRecoveryTrustChain(f.prisma,f.campaigns.r1);assert.equal(gate.ready,true);assert.equal(gate.depth,1);assert.equal(gate.rootCampaignId,"r0");});
test("recursive recovery trust chain rejects stale ancestor evidence",async()=>{const f=prismaFixture({stale:true});const gate=await evaluateRecoveryTrustChain(f.prisma,f.campaigns.r1);assert.equal(gate.ready,false);assert.ok(gate.blockers.includes("recovery_stabilization_snapshot_stale")||gate.blockers.includes("recovery_stabilization_signature_changed"));});
test("recursive recovery trust chain detects cycles",async()=>{const f=prismaFixture({cycle:true});const gate=await evaluateRecoveryTrustChain(f.prisma,f.campaigns.r1);assert.equal(gate.ready,false);assert.ok(gate.blockers.includes("recovery_trust_chain_cycle_detected"));});
