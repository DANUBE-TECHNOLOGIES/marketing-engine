"use strict";

const { buildOperationalReadiness } = require("./operational-readiness");
const { auditProviderCatalog } = require("./provider-catalog-audit");
const { buildRecoveryTrustOverview } = require("./recovery-trust-overview");

const REQUIRED_PRESENCE_MIGRATIONS = Object.freeze([
  "20260823130000_presence_directory_runtime_alignment",
  "20260824113000_presence_operation_snapshots",
  "20260824120000_presence_operation_audit",
  "20260824124500_presence_provider_directory_alignment",
  "20260824142000_presence_campaign_execution_ledger",
  "20260824142000_presence_campaigns",
  "20260824142500_presence_campaign_report",
  "20260824143000_presence_citation_observations",
  "20260825104500_presence_deployment_preflight",
  "20260825154500_presence_campaign_pilot_binding"
]);

function evaluateMigrationReadiness(applied = []) {
  const appliedSet = new Set(applied.filter(Boolean));
  const missing = REQUIRED_PRESENCE_MIGRATIONS.filter((name) => !appliedSet.has(name));
  return Object.freeze({ ready: missing.length === 0, required: REQUIRED_PRESENCE_MIGRATIONS.length, applied: REQUIRED_PRESENCE_MIGRATIONS.length - missing.length, missing: Object.freeze(missing) });
}

function evaluatePilotReadiness({ operational, catalog, migrations, agencyCount = 0, googleListingCount = 0, networkRecoveryTrust = null } = {}) {
  const readOnlyBlockers = [];
  if (!migrations?.ready) readOnlyBlockers.push("presence_migrations");
  if (!catalog?.ready) readOnlyBlockers.push("provider_catalog");
  if (!operational?.readyForGoogleApi) readOnlyBlockers.push("google_api");
  if (agencyCount < 1) readOnlyBlockers.push("agencies");
  const pilotBlockers = [...readOnlyBlockers];
  if (!operational?.readyForGoogleManagedWrites) pilotBlockers.push("google_managed_writes");
  if (Number(networkRecoveryTrust?.summary?.critical || 0) > 0) pilotBlockers.push("critical_recovery_trust");
  const warnings = [];
  if (!operational?.readyForDiscovery) warnings.push("dataforseo_discovery");
  if (googleListingCount < agencyCount) warnings.push("google_listing_coverage");
  if (Number(networkRecoveryTrust?.summary?.blocked || 0) > 0 && Number(networkRecoveryTrust?.summary?.critical || 0) === 0) warnings.push("recovery_trust_warnings");
  return Object.freeze({
    readyForReadOnlyPreflight: readOnlyBlockers.length === 0,
    readyForGooglePilot: pilotBlockers.length === 0,
    readyForDiscoveryPilot: readOnlyBlockers.filter((key) => key !== "google_api").length === 0 && operational?.readyForDiscovery === true,
    readOnlyBlockers: Object.freeze(readOnlyBlockers),
    blockers: Object.freeze(pilotBlockers),
    warnings: Object.freeze(warnings)
  });
}

async function listAppliedMigrations(prisma) {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT migration_name AS "migrationName" FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at');
    return rows.map((row) => row.migrationName).filter(Boolean);
  } catch (error) {
    error.message = `Impossible de lire _prisma_migrations: ${error.message}`;
    throw error;
  }
}

async function buildDeploymentReadiness(prisma, env = process.env) {
  const [operational, directories, agencies, appliedMigrations, networkRecoveryTrust] = await Promise.all([
    buildOperationalReadiness(prisma, env),
    prisma.localDirectory.findMany({ orderBy: { id: "asc" } }),
    prisma.agency.findMany({ select: { id: true }, orderBy: { id: "asc" } }),
    listAppliedMigrations(prisma),
    buildRecoveryTrustOverview(prisma, 200)
  ]);
  const googleDirectory = directories.find((item) => item.name === "Google Business Profile") || null;
  const googleListingCount = googleDirectory ? await prisma.directoryListing.count({ where: { directoryId: googleDirectory.id } }) : 0;
  const catalog = auditProviderCatalog(directories, env);
  const migrations = evaluateMigrationReadiness(appliedMigrations);
  const pilot = evaluatePilotReadiness({ operational, catalog, migrations, agencyCount: agencies.length, googleListingCount, networkRecoveryTrust });
  return Object.freeze({ generatedAt: new Date().toISOString(), operational, catalog, migrations, network: Object.freeze({ agencyCount: agencies.length, googleListingCount, googleListingCoveragePercent: agencies.length ? Math.round((googleListingCount / agencies.length) * 100) : 0 }), networkRecoveryTrust, pilot });
}

module.exports = { REQUIRED_PRESENCE_MIGRATIONS, evaluateMigrationReadiness, evaluatePilotReadiness, listAppliedMigrations, buildDeploymentReadiness };
