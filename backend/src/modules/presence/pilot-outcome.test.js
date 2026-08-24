"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {evaluatePilotOutcome}=require("./pilot-outcome");
function report(overrides={}){return {status:"completed",outcome:"improved",execution:{successRate:100,failed:0},comparison:{coveragePercent:{delta:2},healthScore:{delta:3},anomalies:{delta:-2}},...overrides}}
test("successful completed pilot authorizes rollout",()=>{const r=evaluatePilotOutcome(report());assert.equal(r.decision,"go");assert.equal(r.readyForNetworkRollout,true)});
test("incomplete verification blocks rollout",()=>{const r=evaluatePilotOutcome(report({execution:{successRate:90,failed:0}}));assert.equal(r.decision,"no_go");assert.ok(r.blockers.includes("verification_rate_below_target"))});
test("coverage regression blocks rollout",()=>{const r=evaluatePilotOutcome(report({comparison:{coveragePercent:{delta:-1},healthScore:{delta:0},anomalies:{delta:0}}}));assert.ok(r.blockers.includes("coverage_regression"))});
test("critical propagation alert blocks rollout",()=>{const r=evaluatePilotOutcome(report(),{criticalPropagationAlerts:1});assert.ok(r.blockers.includes("critical_propagation_alerts"))});
test("non completed campaign cannot authorize rollout",()=>{const r=evaluatePilotOutcome(report({status:"verifying"}));assert.ok(r.blockers.includes("campaign_not_completed"))});
