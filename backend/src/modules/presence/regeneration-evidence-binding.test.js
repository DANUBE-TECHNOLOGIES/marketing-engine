"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {compactRegenerationEvidence,frozenRegenerationBindingClean,evaluateRegenerationEvidenceBinding}=require("./regeneration-evidence-binding");

test("ordinary campaign has no regeneration constraint",async()=>{const campaign={campaignId:"c1",approvedScope:{}};assert.equal(compactRegenerationEvidence(campaign).regeneration,false);assert.equal(frozenRegenerationBindingClean(campaign,{report:{}}),true);const gate=await evaluateRegenerationEvidenceBinding({},campaign);assert.equal(gate.ready,true);assert.equal(gate.required,false);});

test("regenerated campaign requires matching immutable report lineage",()=>{const campaign={campaignId:"new",approvedScope:{regenerationOfCampaignId:"old",regenerationReason:"legacy_evidence_incompatible",regenerationSourceDecision:"legacy_requires_regeneration"}};const good={report:{pilotEvidence:{regenerationEvidence:{regeneration:true,sourceCampaignId:"old",reason:"legacy_evidence_incompatible",sourceDecision:"legacy_requires_regeneration"}}}};assert.equal(frozenRegenerationBindingClean(campaign,good),true);assert.equal(frozenRegenerationBindingClean(campaign,{report:{pilotEvidence:{regenerationEvidence:{regeneration:true,sourceCampaignId:"other",reason:"legacy_evidence_incompatible",sourceDecision:"legacy_requires_regeneration"}}}}),false);});

test("missing regeneration source blocks proof",async()=>{const campaign={campaignId:"new",approvedScope:{regenerationOfCampaignId:"old",regenerationReason:"legacy_evidence_incompatible",regenerationSourceDecision:"legacy_requires_regeneration"}};const prisma={$queryRaw:async()=>[]};const gate=await evaluateRegenerationEvidenceBinding(prisma,campaign);assert.equal(gate.ready,false);assert.ok(gate.blockers.includes("regeneration_source_campaign_missing"));});
