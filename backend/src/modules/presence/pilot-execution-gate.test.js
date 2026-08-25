"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluatePilotExecutionGate } = require("./pilot-execution-gate");

function prismaFixture({ preflightId = "pf-1", writes = true } = {}) {
  const migrationNames = [
    "20260823130000_presence_directory_runtime_alignment","20260824113000_presence_operation_snapshots","20260824120000_presence_operation_audit","20260824124500_presence_provider_directory_alignment","20260824142000_presence_campaign_execution_ledger","20260824142000_presence_campaigns","20260824142500_presence_campaign_report","20260824143000_presence_citation_observations","20260825104500_presence_deployment_preflight","20260825154500_presence_campaign_pilot_binding"
  ];
  return {
    presenceDeploymentPreflight: { findFirst: async () => ({ preflightId, status: "ready", createdAt: new Date(), googleWritesEnabled: false, snapshot: { network: { agencyCount: 1, googleListingCount: 1 } } }) },
    localDirectory: { findMany: async () => [{ id: "g", name: "Google Business Profile", active: true, website: "https://business.google.com/", category: "search", impact: "critical", difficulty: "medium", priority: 100 }] },
    agency: { findMany: async () => [{ id: "a1" }] },
    directoryListing: { count: async () => 1 },
    $queryRawUnsafe: async () => migrationNames.map((migrationName) => ({ migrationName })),
    $queryRaw: async () => [{ tableName: "DirectoryListing" },{ tableName: "PresenceOperationSnapshot" },{ tableName: "PresenceOperationAudit" },{ tableName: "PresenceCampaign" },{ tableName: "PresenceCampaignExecution" },{ tableName: "PresenceCampaignReport" },{ tableName: "PresenceCitationObservation" },{ tableName: "PresenceDeploymentPreflight" }]
  };
}

test("non pilot campaigns are not constrained by pilot execution gate", async () => {
  const gate = await evaluatePilotExecutionGate({}, { pilot: false });
  assert.equal(gate.ready, true);
});

test("pilot execution gate rejects mismatched preflight binding", async () => {
  const oldEnv = { ...process.env };
  process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID = "client";
  process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET = "secret";
  process.env.GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN = "refresh";
  process.env.PRESENCE_GOOGLE_WRITES_ENABLED = "true";
  try {
    const campaign = { pilot: true, preflightId: "old-pf", approvedScope: { agencyIds: ["a1"], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false }, plan: { policy: { agencyIds: ["a1"], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false } } };
    const gate = await evaluatePilotExecutionGate(prismaFixture({ preflightId: "pf-1" }), campaign);
    assert.equal(gate.ready, false);
    assert.ok(gate.blockers.includes("pilot_campaign_preflight_mismatch"));
  } finally { process.env = oldEnv; }
});
