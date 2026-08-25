"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluatePilotExecutionGate } = require("./pilot-execution-gate");
const { REQUIRED_COLUMNS } = require("./directory-schema-audit");

function prismaFixture({ preflightId = "pf-1" } = {}) {
  const migrationNames = [
    "20260823130000_presence_directory_runtime_alignment","20260824113000_presence_operation_snapshots","20260824120000_presence_operation_audit","20260824124500_presence_provider_directory_alignment","20260824142000_presence_campaign_execution_ledger","20260824142000_presence_campaigns","20260824142500_presence_campaign_report","20260824143000_presence_citation_observations","20260825104500_presence_deployment_preflight","20260825154500_presence_campaign_pilot_binding"
  ];
  const schemaRows = Object.entries(REQUIRED_COLUMNS).flatMap(([tableName, columns]) => columns.map((columnName) => ({ tableName, columnName })));
  const storageRows = ["PresenceOperationAudit","PresenceOperationSnapshot","PresenceCampaign","PresenceCampaignEvent","PresenceCampaignExecution","PresenceCampaignReport","PresenceCitationObservation","PresenceDeploymentPreflight"].map((tableName) => ({ tableName }));
  return {
    googleToken: { findFirst: async () => ({ refreshToken: "refresh" }) },
    presenceDeploymentPreflight: { findFirst: async () => ({ preflightId, status: "ready", createdAt: new Date(), googleWritesEnabled: false, snapshot: { network: { agencyCount: 1, googleListingCount: 1 } } }) },
    localDirectory: { findMany: async () => [{ id: "g", name: "Google Business Profile", active: true, website: "https://business.google.com/", category: "search", impact: "critical", difficulty: "medium", priority: 100 }] },
    agency: { findMany: async () => [{ id: 1 }] },
    directoryListing: { count: async () => 1 },
    $queryRawUnsafe: async (sql) => {
      const text = String(sql || "");
      if (text.includes("information_schema.columns")) return schemaRows;
      if (text.includes("information_schema.tables")) return storageRows;
      if (text.includes("_prisma_migrations")) return migrationNames.map((migrationName) => ({ migrationName }));
      return [];
    }
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
    const campaign = { pilot: true, preflightId: "old-pf", approvedScope: { agencyIds: [1], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false }, plan: { policy: { agencyIds: [1], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false }, selected: [] } };
    const gate = await evaluatePilotExecutionGate(prismaFixture({ preflightId: "pf-1" }), campaign);
    assert.equal(gate.ready, false);
    assert.ok(gate.blockers.includes("pilot_campaign_preflight_mismatch"));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
  }
});
