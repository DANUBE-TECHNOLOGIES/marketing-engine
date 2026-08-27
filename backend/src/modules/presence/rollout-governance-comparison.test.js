"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const{compareRolloutGovernance}=require("./rollout-governance-comparison");
function snap(id,percent,version=1){return{snapshotId:id,governancePolicy:{acknowledgementSealingMinPercent:percent,version}};}
test("missing baseline is informational",()=>{const r=compareRolloutGovernance(snap("current",0),null);assert.equal(r.baselineMissing,true);assert.equal(r.changed,false);assert.equal(r.direction,"baseline_missing");});
test("identical governance is unchanged",()=>{const r=compareRolloutGovernance(snap("current",80),snap("frozen",80));assert.equal(r.changed,false);assert.equal(r.direction,"unchanged");assert.equal(r.severity,"none");});
test("tightening governance is critical",()=>{const r=compareRolloutGovernance(snap("current",80),snap("frozen",20));assert.equal(r.changed,true);assert.equal(r.direction,"tightened");assert.equal(r.severity,"critical");});
test("relaxing governance is warning",()=>{const r=compareRolloutGovernance(snap("current",20),snap("frozen",80));assert.equal(r.direction,"relaxed");assert.equal(r.severity,"warning");});
test("legacy frozen policy is explicit migration warning",()=>{const r=compareRolloutGovernance(snap("current",0),{snapshotId:"legacy"});assert.equal(r.legacyFrozenPolicy,true);assert.equal(r.direction,"legacy_migration");assert.equal(r.severity,"warning");});
