"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {evaluateCampaignEvidenceCompatibility}=require("./campaign-evidence-compatibility");

function campaign(){return{pilot:true,preflightId:"pf-1",approvedScope:{preflightRecoveryTrustFingerprint:"fp-1"}};}
function report(){return{pilotEvidence:{preflightId:"pf-1",preflightRecoveryTrustFingerprint:"fp-1",preflightRecoveryTrustBinding:{ready:true,expected:"fp-1",current:"fp-1"},networkRecoveryTrust:{critical:0}}};}

test("current pilot evidence is compatible",()=>{const state=evaluateCampaignEvidenceCompatibility(campaign(),report());assert.equal(state.compatible,true);assert.equal(state.regenerationRequired,false);});
test("legacy evidence missing trust binding requires regeneration instead of mutation",()=>{const state=evaluateCampaignEvidenceCompatibility({pilot:true,preflightId:"pf-old",approvedScope:{}},{pilotEvidence:{preflightId:"pf-old"}});assert.equal(state.compatible,false);assert.equal(state.legacy,true);assert.equal(state.decision,"legacy_requires_regeneration");assert.ok(state.blockers.includes("legacy_report_preflight_binding_missing"));});
test("mismatched frozen binding is invalid",()=>{const bad=report();bad.pilotEvidence.preflightRecoveryTrustBinding={ready:true,expected:"fp-2",current:"fp-2"};const state=evaluateCampaignEvidenceCompatibility(campaign(),bad);assert.equal(state.compatible,false);assert.equal(state.legacy,false);assert.equal(state.decision,"invalid");assert.ok(state.blockers.includes("report_preflight_binding_expected_mismatch"));});
test("frozen report with critical recovery trust cannot be reused",()=>{const bad=report();bad.pilotEvidence.networkRecoveryTrust={critical:1};const state=evaluateCampaignEvidenceCompatibility(campaign(),bad);assert.equal(state.compatible,false);assert.ok(state.blockers.includes("report_frozen_with_critical_recovery_trust"));});
