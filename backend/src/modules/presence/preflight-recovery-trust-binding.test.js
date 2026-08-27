"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { compactPreflightRecoveryTrust, preflightRecoveryTrustFingerprint, evaluatePreflightRecoveryTrustBinding } = require("./preflight-recovery-trust-binding");

function preflight() {
  return { report: { recoveryTrust: { summary: { total: 2, healthy: 2, blocked: 0, critical: 0 }, campaigns: [] } } };
}

test("preflight recovery trust fingerprint is deterministic", () => {
  const a = preflightRecoveryTrustFingerprint(preflight());
  const b = preflightRecoveryTrustFingerprint(preflight());
  assert.equal(a, b);
  assert.deepEqual(compactPreflightRecoveryTrust(preflight()).criticalCampaignIds, []);
});

test("pilot campaign must carry the exact frozen preflight trust fingerprint", () => {
  const pf = preflight();
  const fingerprint = preflightRecoveryTrustFingerprint(pf);
  const ok = evaluatePreflightRecoveryTrustBinding({ pilot: true, approvedScope: { preflightRecoveryTrustFingerprint: fingerprint } }, pf);
  assert.equal(ok.ready, true);
  const stale = evaluatePreflightRecoveryTrustBinding({ pilot: true, approvedScope: { preflightRecoveryTrustFingerprint: "other" } }, pf);
  assert.equal(stale.ready, false);
  assert.ok(stale.blockers.includes("campaign_preflight_recovery_trust_mismatch"));
});

test("legacy pilot campaign without preflight trust binding is NO-GO", () => {
  const gate = evaluatePreflightRecoveryTrustBinding({ pilot: true, approvedScope: {} }, preflight());
  assert.equal(gate.ready, false);
  assert.ok(gate.blockers.includes("campaign_preflight_recovery_trust_missing"));
});
