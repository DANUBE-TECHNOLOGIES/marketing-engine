"use strict";

const { buildOperationalReadiness } = require("./operational-readiness");
const { auditProviderCatalog } = require("./provider-catalog-audit");

const REQUIRED_PRESENCE_MIGRATIONS = Object.freeze([
  "20260823130000_presence_directory_runtime_alignment",
  "20260824113000_presence_operation_snapshots",
  "20260824120000_presence_operation_audit",
  "20260824124500_presence_provider_directory_alignment",
  "20260824142000_presence_campaign_execution_ledger",
  "20260824142000_presence_campaigns",
  "20260824142500_presence_campaign_report",
  "20260824143000_presence_citation_observations"
]);

function evaluateMigrationReadiness(applied = []) {
  const appliedSet = new Set(applied.filter(Boolean));
  const missing = REQUIRED_PRESENCE_MIGRATIONS.filter((name) => !appliedSet.has(name));
  return Object.freeze({ ready: missing.length === 0, required: REQUIRED_PRESENCE_MIGRATIONS.length, applied: REQUIRED_PRESENCE_MIGRATIONS.length - missing.length, missing: Object.freeze(missing) });
}

function evaluatePilotReadiness({ operational, catalog, migrations, agencyCount = 0, googleListingCount = 0 } = {}) {
  const blockers = [];
  if (!migrations?.ready) blockers.push("presence_migrations");
  if (!catalog?.ready) blockers.push("provider_catalog");
  if (!operational?.readyForGoogleManagedWrites) blockers.push("google_managed_writes");
  if (agencyCount < 1) blockers.push("agencies");
  const warnings = [];
  if (!operational?.readyForDiscovery) warnings.push("dataforseo_discovery");
  if (googleListingCount < agencyCount) warnings.push("google_listing_coverage");
  return Object.freeze({ readyForGooglePilot: blockers.length === 0, readyForDiscoveryPilot: blockers.filter((key) => key !== "google_managed_writes").length === 0 && operational?.readyForDiscovery === true, blockers: Object.freeze(blockers), warnings: Object.freeze(warnings) });
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
  const [operational, directories, agencies, appliedMigrations] = await Promise.all([
    buildOperationalReadiness(prisma, env),
    prisma.localDirectory.findMany({ orderBy: { id: "asc" } }),
    prisma.agency.findMany({ select: { id: true }, orderBy: { id: "asc" } }),
    listAppliedMigrations(prisma)
  ]);
  const googleDirectory = directories.find((item) => item.name === "Google Business Profile") || null;
  const googleListingCount = googleDirectory ? await prisma.directoryListing.count({ where: { directoryId: googleDirectory.id } }) : 0;
  const catalog = auditProviderCatalog(directories, env);
  const migrations = evaluateMigrationReadiness(appliedMigrations);
  const pilot = evaluatePilotReadiness({ operational, catalog, migrations, agencyCount: agencies.length, googleListingCount });
  return Object.freeze({ generatedAt: new Date().toISOString(), operational, catalog, migrations, network: Object.freeze({ agencyCount: agencies.length, googleListingCount, googleListingCoveragePercent: agencies.length ? Math.round((googleListingCount / agencies.length) * 100) : 0 }), pilot });
}

module.exports = { REQUIRED_PRESENCE_MIGRATIONS, evaluateMigrationReadiness, evaluatePilotReadiness, listAppliedMigrations, buildDeploymentReadiness };
