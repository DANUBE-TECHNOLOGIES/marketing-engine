"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { REQUIRED_PRESENCE_MIGRATIONS, evaluateMigrationReadiness, evaluatePilotReadiness } = require("./deployment-readiness");

test("deployment migration gate requires every Presence migration", () => {
  const partial = evaluateMigrationReadiness(REQUIRED_PRESENCE_MIGRATIONS.slice(0, -1));
  assert.equal(partial.ready, false);
  assert.equal(partial.missing.length, 1);
  const complete = evaluateMigrationReadiness(REQUIRED_PRESENCE_MIGRATIONS);
  assert.equal(complete.ready, true);
  assert.equal(complete.applied, complete.required);
});

test("read-only preflight can be green while Google writes remain killed", () => {
  const readiness = evaluatePilotReadiness({
    operational: { readyForGoogleApi: true, readyForGoogleManagedWrites: false, readyForDiscovery: false },
    catalog: { ready: true },
    migrations: { ready: true },
    agencyCount: 7,
    googleListingCount: 7
  });
  assert.equal(readiness.readyForReadOnlyPreflight, true);
  assert.equal(readiness.readyForGooglePilot, false);
  assert.deepEqual(readiness.preflightBlockers, []);
  assert.ok(readiness.blockers.includes("google_managed_writes"));
  assert.deepEqual(readiness.warnings, ["dataforseo_discovery"]);
});

test("Google pilot is allowed only when API and managed writes are ready", () => {
  const readiness = evaluatePilotReadiness({
    operational: { readyForGoogleApi: true, readyForGoogleManagedWrites: true, readyForDiscovery: false },
    catalog: { ready: true },
    migrations: { ready: true },
    agencyCount: 7,
    googleListingCount: 7
  });
  assert.equal(readiness.readyForReadOnlyPreflight, true);
  assert.equal(readiness.readyForGooglePilot, true);
  assert.equal(readiness.readyForDiscoveryPilot, false);
});

test("incomplete Google listing coverage is a warning, not a false pilot blocker", () => {
  const readiness = evaluatePilotReadiness({
    operational: { readyForGoogleApi: true, readyForGoogleManagedWrites: true, readyForDiscovery: true },
    catalog: { ready: true },
    migrations: { ready: true },
    agencyCount: 7,
    googleListingCount: 5
  });
  assert.equal(readiness.readyForGooglePilot, true);
  assert.ok(readiness.warnings.includes("google_listing_coverage"));
});
