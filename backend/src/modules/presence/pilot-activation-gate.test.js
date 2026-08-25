"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");

function readiness(overrides = {}) {
  return {
    pilot: { readyForReadOnlyPreflight: true, readyForGooglePilot: true },
    operational: { readyForGoogleApi: true, googleWritesEnabled: true },
    network: { agencyCount: 7, googleListingCount: 7 },
    ...overrides
  };
}

function preflight(overrides = {}) {
  return {
    preflightId: "preflight-123",
    createdAt: "2026-08-25T09:00:00.000Z",
    readOnlyReady: true,
    googleWritesEnabled: false,
    report: { network: { agencyCount: 7, googleListingCount: 7 } },
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
