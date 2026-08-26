"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {compactCampaign,buildRegenerationLineage}=require("./campaign-regeneration-lineage");

test("regeneration lineage compacts audit fields",()=>{const row=compactCampaign({campaignId:"regen-1",name:"Régénération",status:"draft",preflightId:"pf-new",createdAt:"2026-08-27T00:00:00Z",approvedScope:{regenerationReason:"legacy_evidence_incompatible",regenerationSourceDecision:"legacy_requires_regeneration"}});assert.equal(row.campaignId,"regen-1");assert.equal(row.regenerationReason,"legacy_evidence_incompatible");assert.equal(row.regenerationSourceDecision,"legacy_requires_regeneration");});

test("regeneration lineage links source and active child",async()=>{const campaign={campaignId:"legacy-1",approvedScope:{}};const child={campaignId:"regen-1",name:"Régénération",status:"approved",preflightId:"pf-new",approvedScope:{regenerationOfCampaignId:"legacy-1",regenerationReason:"legacy_evidence_incompatible"},createdAt:new Date()};const prisma={$queryRaw:async()=>[child]};const lineage=await buildRegenerationLineage(prisma,campaign);assert.equal(lineage.regenerated,false);assert.equal(lineage.children.length,1);assert.equal(lineage.hasActiveChild,true);assert.equal(lineage.activeChild.campaignId,"regen-1");});

test("regenerated campaign exposes its source",async()=>{const campaign={campaignId:"regen-1",approvedScope:{regenerationOfCampaignId:"legacy-1"}};const source={campaignId:"legacy-1",name:"Legacy",status:"completed",preflightId:"pf-old",approvedScope:{}};let calls=0;const prisma={$queryRaw:async()=>{calls+=1;return calls===1?[source]:[];}};const lineage=await buildRegenerationLineage(prisma,campaign);assert.equal(lineage.regenerated,true);assert.equal(lineage.sourceCampaignId,"legacy-1");assert.equal(lineage.source.campaignId,"legacy-1");});
