"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");

function readiness(overrides = {}) {
  return {
    pilot: { readyForReadOnlyPreflight: true, readyForGooglePilot: true },
    operational: { readyForGoogleApi: true, googleWritesEnabled: true },
    network: { agencyCount: 7, googleListingCount: 7 },
    networkRecoveryTrust: { ready: true, decision: "go", summary: { total: 0, healthy: 0, blocked: 0, critical: 0 }, campaigns: [] },
    ...overrides
  };
}

function preflight(overrides = {}) {
  return {
    preflightId: "preflight-123",
    createdAt: "2026-08-25T09:00:00.000Z",
    readOnlyReady: true,
    googleWritesEnabled: false,
    report: { network: { agencyCount: 7, googleListingCount: 7 }, networkRecoveryTrust: { ready: true, decision: "go", summary: { total: 0, healthy: 0, blocked: 0, critical: 0 }, campaigns: [] } },
    ...overrides
  };
}

test("pilot activation is GO only with recent read-only preflight and current write readiness", () => {
  const gate = evaluatePilotActivationGate({ preflight: preflight(), currentReadiness: readiness(), now: new Date("2026-08-25T10:00:00.000Z") });
  assert.equal(gate.ready, true);
  assert.equal(gate.decision, "GO");
  assert.deepEqual(gate.blockers, []);
});

test("pilot activation rejects missing or expired frozen preflight", () => {
  const missing = evaluatePilotActivationGate({ preflight: null, currentReadiness: readiness(), now: new Date("2026-08-25T10:00:00.000Z") });
  assert.equal(missing.ready, false);
  assert.ok(missing.blockers.includes("frozen_preflight_missing"));
  const expired = evaluatePilotActivationGate({ preflight: preflight({ createdAt: "2026-08-23T09:00:00.000Z" }), currentReadiness: readiness(), now: new Date("2026-08-25T10:00:00.000Z") });
  assert.ok(expired.blockers.includes("frozen_preflight_expired"));
});

test("pilot activation rejects disabled kill-switch after preflight", () => {
  const current = readiness({ pilot: { readyForReadOnlyPreflight: true, readyForGooglePilot: false }, operational: { readyForGoogleApi: true, googleWritesEnabled: false } });
  const gate = evaluatePilotActivationGate({ preflight: preflight(), currentReadiness: current, now: new Date("2026-08-25T10:00:00.000Z") });
  assert.equal(gate.ready, false);
  assert.ok(gate.blockers.includes("google_write_kill_switch_disabled"));
  assert.ok(gate.blockers.includes("current_google_pilot_not_ready"));
});

test("network changes since preflight are warnings, not silent", () => {
  const gate = evaluatePilotActivationGate({ preflight: preflight(), currentReadiness: readiness({ network: { agencyCount: 8, googleListingCount: 7 } }), now: new Date("2026-08-25T10:00:00.000Z") });
  assert.equal(gate.ready, true);
  assert.ok(gate.warnings.includes("agency_count_changed_since_preflight"));
});

test("critical recovery trust appearing after preflight invalidates activation", () => {
  const current = readiness({ pilot: { readyForReadOnlyPreflight: true, readyForGooglePilot: false }, networkRecoveryTrust: { ready: false, decision: "no_go", summary: { total: 1, healthy: 0, blocked: 1, critical: 1 }, campaigns: [{ campaignId: "recovery-1", severity: "critical" }] } });
  const gate = evaluatePilotActivationGate({ preflight: preflight(), currentReadiness: current, now: new Date("2026-08-25T10:00:00.000Z") });
  assert.equal(gate.ready, false);
  assert.ok(gate.blockers.includes("critical_recovery_trust_since_preflight"));
});

test("legacy preflight without recovery trust cannot activate writes", () => {
  const gate = evaluatePilotActivationGate({ preflight: preflight({ report: { network: { agencyCount: 7, googleListingCount: 7 } } }), currentReadiness: readiness(), now: new Date("2026-08-25T10:00:00.000Z") });
  assert.equal(gate.ready, false);
  assert.ok(gate.blockers.includes("frozen_preflight_recovery_trust_missing"));
});
