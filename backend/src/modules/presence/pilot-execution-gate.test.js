"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluatePilotExecutionGate, compactGovernanceDiagnostic } = require("./pilot-execution-gate");

function prismaFixture({ preflightId = "pf-1" } = {}) {
  const migrationNames = [
    "20260823130000_presence_directory_runtime_alignment","20260824113000_presence_operation_snapshots","20260824120000_presence_operation_audit","20260824124500_presence_provider_directory_alignment","20260824142000_presence_campaign_execution_ledger","20260824142000_presence_campaigns","20260824142500_presence_campaign_report","20260824143000_presence_citation_observations","20260825104500_presence_deployment_preflight","20260825154500_presence_campaign_pilot_binding"
  ];
  const preflight = { preflightId, status: "read_only_ready", readOnlyReady: true, googleApiReady: true, googlePilotEnabled: false, googleWritesEnabled: false, createdAt: new Date(), report: { network: { agencyCount: 1, googleListingCount: 1 } } };
  const schemaRows = [];
  const columns = {
    LocalDirectory: ["id","name","website","category","impactScore","difficulty","priority","active","createdAt","url","submissionUrl","submissionMode"],
    DirectoryListing: ["id","agencyId","directoryId","listingUrl","status","nameCorrect","addressCorrect","phoneCorrect","websiteCorrect","hoursCorrect","categoryCorrect","notes","lastCheckedAt","createdAt","updatedAt","submissionPayload","submittedAt","automationStatus","score","verified","phoneMatch","addressMatch","websiteMatch"]
  };
  for (const [tableName, names] of Object.entries(columns)) for (const columnName of names) schemaRows.push({ tableName, columnName });
  const storageRows = ["PresenceOperationAudit","PresenceOperationSnapshot","PresenceCampaign","PresenceCampaignEvent","PresenceCampaignExecution","PresenceCampaignReport","PresenceCitationObservation","PresenceDeploymentPreflight"].map((tableName) => ({ tableName }));
  return {
    googleToken: { findFirst: async () => ({ refreshToken: "refresh" }) },
    localDirectory: { findMany: async () => [{ id: "g", name: "Google Business Profile", active: true, website: "https://business.google.com/", category: "search", impactScore: 100, difficulty: "medium", priority: 100, submissionMode: "managed_api" }] },
    agency: { findMany: async () => [{ id: 1 }] },
    directoryListing: { count: async () => 1 },
    $queryRawUnsafe: async (sql) => String(sql).includes("_prisma_migrations") ? migrationNames.map((migrationName) => ({ migrationName })) : String(sql).includes("information_schema.columns") ? schemaRows : storageRows,
    $queryRaw: async () => [preflight]
  };
}

test("non pilot campaigns are not constrained by pilot execution gate", async () => {
  const gate = await evaluatePilotExecutionGate({}, { pilot: false });
  assert.equal(gate.ready, true);
  assert.equal(gate.governanceDiagnostic, null);
});

test("pilot execution gate rejects mismatched preflight binding", async () => {
  const oldEnv = { ...process.env };
  process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID = "client";
  process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET = "secret";
  process.env.GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN = "refresh";
  process.env.PRESENCE_GOOGLE_WRITES_ENABLED = "true";
  try {
    const campaign = { pilot: true, preflightId: "old-pf", approvedScope: { agencyIds: [1], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false }, approvedPlanFingerprint: "invalid-on-purpose", plan: { policy: { agencyIds: [1], providerKeys: ["google_business_profile"], maxItems: 10, allowSensitive: false }, selected: [] } };
    const gate = await evaluatePilotExecutionGate(prismaFixture({ preflightId: "pf-1" }), campaign);
    assert.equal(gate.ready, false);
    assert.ok(gate.blockers.includes("pilot_campaign_preflight_mismatch"));
  } finally { process.env = oldEnv; }
});

test("final execution governance diagnostic compacts critical policy drift",()=>{const diagnostic=compactGovernanceDiagnostic({decisionAcknowledgement:{governancePolicyDrift:true,currentSnapshotId:"current",previousSnapshotId:"previous",blockers:["critical_rollout_decision_drift_unacknowledged","critical_rollout_governance_policy_drift_unacknowledged"],drift:{severity:"critical",changes:[{type:"governance_policy",before:{acknowledgementSealingMinPercent:20,version:1},after:{acknowledgementSealingMinPercent:80,version:1}}]}}});assert.equal(diagnostic.policyDrift,true);assert.equal(diagnostic.severity,"critical");assert.equal(diagnostic.before.acknowledgementSealingMinPercent,20);assert.equal(diagnostic.after.acknowledgementSealingMinPercent,80);assert.deepEqual(diagnostic.blockers,["critical_rollout_governance_policy_drift_unacknowledged"]);});

test("final execution governance diagnostic stays neutral without policy change",()=>{const diagnostic=compactGovernanceDiagnostic({decisionAcknowledgement:{governancePolicyDrift:false,currentSnapshotId:"current",previousSnapshotId:"previous",blockers:[],drift:{severity:"none",changes:[]}}});assert.equal(diagnostic.policyDrift,false);assert.equal(diagnostic.severity,"none");assert.equal(diagnostic.before,null);assert.equal(diagnostic.after,null);assert.deepEqual(diagnostic.blockers,[]);});
