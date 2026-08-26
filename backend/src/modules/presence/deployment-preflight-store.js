"use strict";

const crypto = require("node:crypto");

function json(value) { return JSON.stringify(value ?? null); }
function compactNetworkRecoveryTrust(readiness) {
  const trust = readiness?.networkRecoveryTrust || {};
  return {
    ready: trust.ready === true,
    decision: trust.decision || null,
    total: Number(trust?.summary?.total || 0),
    healthy: Number(trust?.summary?.healthy || 0),
    blocked: Number(trust?.summary?.blocked || 0),
    critical: Number(trust?.summary?.critical || 0),
    criticalCampaignIds: (trust.campaigns || []).filter((row) => row.severity === "critical").map((row) => row.campaignId).sort()
  };
}
function createPreflightId(readiness) {
  const payload = JSON.stringify({ generatedAt: readiness.generatedAt, migrations: readiness.migrations, catalog: readiness.catalog?.summary, network: readiness.network, networkRecoveryTrust: compactNetworkRecoveryTrust(readiness), operational: { readyForGoogleApi: readiness.operational?.readyForGoogleApi, googleWritesEnabled: readiness.operational?.googleWritesEnabled }, pilot: readiness.pilot });
  return `preflight-${crypto.createHash("sha256").update(payload).digest("hex").slice(0, 20)}`;
}

async function freezeDeploymentPreflight(prisma, readiness) {
  const preflightId = createPreflightId(readiness);
  const readOnlyReady = readiness.pilot?.readyForReadOnlyPreflight === true;
  const googleApiReady = readiness.operational?.readyForGoogleApi === true;
  const googlePilotEnabled = readiness.pilot?.readyForGooglePilot === true;
  const googleWritesEnabled = readiness.operational?.googleWritesEnabled === true;
  const status = readOnlyReady ? (googlePilotEnabled ? "pilot_enabled" : "read_only_ready") : "blocked";
  await prisma.$executeRaw`
    INSERT INTO "PresenceDeploymentPreflight" ("preflightId", "status", "readOnlyReady", "googleApiReady", "googlePilotEnabled", "googleWritesEnabled", "report")
    VALUES (${preflightId}, ${status}, ${readOnlyReady}, ${googleApiReady}, ${googlePilotEnabled}, ${googleWritesEnabled}, CAST(${json(readiness)} AS JSONB))
    ON CONFLICT ("preflightId") DO NOTHING
  `;
  const rows = await prisma.$queryRaw`SELECT * FROM "PresenceDeploymentPreflight" WHERE "preflightId" = ${preflightId} LIMIT 1`;
  return rows[0] || null;
}

async function listDeploymentPreflights(prisma, limit = 20) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 20), 100));
  return prisma.$queryRaw`SELECT * FROM "PresenceDeploymentPreflight" ORDER BY "createdAt" DESC LIMIT ${safeLimit}`;
}

async function getLatestDeploymentPreflight(prisma) {
  const rows = await prisma.$queryRaw`SELECT * FROM "PresenceDeploymentPreflight" ORDER BY "createdAt" DESC LIMIT 1`;
  return rows[0] || null;
}

module.exports = { compactNetworkRecoveryTrust, createPreflightId, freezeDeploymentPreflight, listDeploymentPreflights, getLatestDeploymentPreflight };
