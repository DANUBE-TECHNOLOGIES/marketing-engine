"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluateControlledPilot } = require("./pilot-readiness");

function deployment(overrides = {}) {
  return {
    pilot: { readyForGooglePilot: true },
    network: { agencyCount: 7, googleListingCount: 7, googleListingCoveragePercent: 100 },
    ...overrides
  };
}

function plan(overrides = {}) {
  return {
    policy: { agencyIds: [1, 2], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false },
    selectedCount: 2,
    executableCount: 2,
    manualCount: 0,
    selected: [{ agencyId: 1, drift: ["phone"] }, { agencyId: 2, drift: ["website"] }],
    ...overrides
  };
}

test("small non-sensitive Google pilot is go when deployment is ready", () => {
  const result = evaluateControlledPilot({ deploymentReadiness: deployment(), plan: plan() });
  assert.equal(result.ready, true);
  assert.equal(result.decision, "go");
  assert.equal(result.blockers.length, 0);
  assert.equal(result.successThresholds.minimumVerificationRatePercent, 100);
});

test("pilot blocks oversized scope and sensitive drift", () => {
  const result = evaluateControlledPilot({ deploymentReadiness: deployment(), plan: plan({ policy: { agencyIds: [1, 2, 3, 4] }, selected: [{ agencyId: 1, drift: ["address"] }], selectedCount: 1 }) });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("pilot_scope_too_large"));
  assert.ok(result.blockers.includes("pilot_contains_sensitive_name_or_address_changes"));
});

test("pilot blocks when deployment readiness is red", () => {
  const result = evaluateControlledPilot({ deploymentReadiness: deployment({ pilot: { readyForGooglePilot: false } }), plan: plan() });
  assert.equal(result.decision, "no_go");
  assert.ok(result.blockers.includes("deployment_not_ready_for_google_pilot"));
});
