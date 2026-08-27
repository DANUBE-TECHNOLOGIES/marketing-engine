"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isRecoveryCampaign, trustSeverity, rolloutTrustBlockers } = require("./recovery-trust-overview");

test("recovery trust overview identifies only recovery campaigns",()=>{assert.equal(isRecoveryCampaign({approvedScope:{recoveryOfCampaignId:"c1"}}),true);assert.equal(isRecoveryCampaign({approvedScope:{}}),false);});
test("recovery trust severity escalates stale and structural blockers",()=>{assert.equal(trustSeverity({ready:true,blockers:[]}),"ok");assert.equal(trustSeverity({ready:false,blockers:["recovery_stabilization_snapshot_stale"]}),"critical");assert.equal(trustSeverity({ready:false,blockers:["recovery_trust_chain_binding_missing"]}),"warning");});
test("critical recovery trust blocks every rollout gate",()=>{const blockers=rolloutTrustBlockers({campaigns:[{campaignId:"recovery-1",severity:"critical"},{campaignId:"recovery-2",severity:"warning"}]});assert.ok(blockers.includes("critical_recovery_trust_blocks_rollout"));assert.ok(blockers.includes("critical_recovery:recovery-1"));assert.equal(blockers.some((b)=>b.includes("recovery-2")),false);});
test("warning-only recovery trust does not globally block rollout",()=>{assert.deepEqual([...rolloutTrustBlockers({campaigns:[{campaignId:"recovery-2",severity:"warning"}]})],[]);});
