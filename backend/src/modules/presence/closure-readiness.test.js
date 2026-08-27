"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { structuralClosureBlockers, buildResidualDebt, buildActivationBlockers } = require("./closure-readiness");

function baseDeployment() {
  return {
    migrations: { ready: true },
    catalog: { ready: true },
    operational: {
      readyForDiscovery: true,
      checks: [
        { key: "directory_schema", ok: true },
        { key: "presence_storage", ok: true },
        { key: "apple_provider", ok: true }
      ]
    },
    pilot: { blockers: [] }
  };
}

test("structural closure ignores runtime write activation", () => {
  const deployment = baseDeployment();
  deployment.operational.readyForGoogleManagedWrites = false;
  deployment.operational.checks.push({ key: "google_writes_enabled", ok: false });
  assert.deepEqual(structuralClosureBlockers(deployment), []);
});

test("structural closure reports migrations schema storage and catalog", () => {
  const deployment = baseDeployment();
  deployment.migrations.ready = false;
  deployment.catalog.ready = false;
  deployment.operational.checks = [
    { key: "directory_schema", ok: false },
    { key: "presence_storage", ok: false }
  ];
  assert.deepEqual(new Set(structuralClosureBlockers(deployment)), new Set(["presence_migrations", "directory_schema", "presence_storage", "provider_catalog"]));
});

test("optional capabilities stay in residual debt", () => {
  const deployment = baseDeployment();
  deployment.operational.readyForDiscovery = false;
  deployment.operational.checks = [
    { key: "directory_schema", ok: true },
    { key: "presence_storage", ok: true },
    { key: "apple_provider", ok: false }
  ];
  const debt = buildResidualDebt({ deployment, acknowledgement: { acknowledgementSealingMaturity: { versioned: true, fullyExplicit: false } } });
  assert.deepEqual(new Set(debt), new Set(["dataforseo_discovery_optional", "apple_provider_optional", "acknowledgement_chain_legacy_sealing"]));
});

test("activation blockers aggregate runtime gates", () => {
  const deployment = baseDeployment();
  deployment.pilot.blockers = ["google_managed_writes"];
  const blockers = buildActivationBlockers({ deployment, rolloutGate: { blockers: ["rollout_stage"] }, acknowledgement: { blockers: ["critical_rollout_decision_drift_unacknowledged"] } });
  assert.deepEqual(new Set(blockers), new Set(["google_managed_writes", "rollout_stage", "critical_rollout_decision_drift_unacknowledged"]));
});
