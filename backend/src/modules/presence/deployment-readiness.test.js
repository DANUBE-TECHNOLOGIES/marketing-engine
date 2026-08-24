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

test("Google pilot is blocked by storage/catalog/write blockers but not discovery warning", () => {
  const readiness = evaluatePilotReadiness({
    operational: { readyForGoogleManagedWrites: true, readyForDiscovery: false },
    catalog: { ready: true },
    migrations: { ready: true },
    agencyCount: 7,
    googleListingCount: 7
  });
  assert.equal(readiness.readyForGooglePilot, true);
  assert.equal(readiness.readyForDiscoveryPilot, false);
  assert.deepEqual(readiness.warnings, ["dataforseo_discovery"]);
});

test("incomplete Google listing coverage is a warning, not a false pilot blocker", () => {
  const readiness = evaluatePilotReadiness({
    operational: { readyForGoogleManagedWrites: true, readyForDiscovery: true },
    catalog: { ready: true },
    migrations: { ready: true },
    agencyCount: 7,
    googleListingCount: 5
  });
  assert.equal(readiness.readyForGooglePilot, true);
  assert.ok(readiness.warnings.includes("google_listing_coverage"));
});
