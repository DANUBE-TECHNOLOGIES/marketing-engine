"use strict";

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { buildDeploymentReadiness } = require("../src/modules/presence/deployment-readiness");
const { freezeDeploymentPreflight } = require("../src/modules/presence/deployment-preflight-store");

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

function safeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function reportPath(timestamp) {
  const root = process.env.PRESENCE_REPORT_DIR || path.resolve(__dirname, "../../reports/presence");
  fs.mkdirSync(root, { recursive: true });
  return path.join(root, `presence-read-only-preflight-${safeTimestamp(timestamp)}.json`);
}

function buildHandoffReport(readiness, frozen = null, generatedAt = new Date()) {
  return {
    ok: readiness.pilot?.readyForReadOnlyPreflight === true,
    mode: "presence-vm-read-only-handoff",
    generatedAt: generatedAt.toISOString(),
    externalWritesPerformed: false,
    safety: {
      googleWriteKillSwitchEnv: "PRESENCE_GOOGLE_WRITES_ENABLED",
      googleWritesEnabled: readiness.operational?.googleWritesEnabled === true,
      safeReadOnlyMode: readiness.operational?.googleWritesEnabled !== true
    },
    decision: {
      readOnlyPreflight: readiness.pilot?.readyForReadOnlyPreflight === true ? "GO" : "NO-GO",
      googlePilot: readiness.pilot?.readyForGooglePilot === true ? "GO" : "NO-GO",
      discoveryPilot: readiness.pilot?.readyForDiscoveryPilot === true ? "GO" : "NO-GO"
    },
    migrations: readiness.migrations,
    catalog: readiness.catalog?.summary || null,
    network: readiness.network,
    operational: {
      readyForGoogleApi: readiness.operational?.readyForGoogleApi === true,
      readyForGoogleManagedWrites: readiness.operational?.readyForGoogleManagedWrites === true,
      readyForDiscovery: readiness.operational?.readyForDiscovery === true,
      apiBlockers: readiness.operational?.apiBlockers || [],
      blockers: readiness.operational?.blockers || [],
      warnings: readiness.operational?.warnings || []
    },
    pilot: readiness.pilot,
    frozen: frozen ? {
      preflightId: frozen.preflightId,
      status: frozen.status,
      createdAt: frozen.createdAt || null,
      readOnlyReady: frozen.readOnlyReady,
      googleApiReady: frozen.googleApiReady,
      googlePilotEnabled: frozen.googlePilotEnabled,
      googleWritesEnabled: frozen.googleWritesEnabled
    } : null
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant");
  if (String(process.env.PRESENCE_GOOGLE_WRITES_ENABLED || "").trim().toLowerCase() === "true") {
    const error = new Error("Préflight refusé: PRESENCE_GOOGLE_WRITES_ENABLED doit rester désactivé pendant le handoff lecture seule.");
    error.code = "GOOGLE_WRITES_ENABLED";
    throw error;
  }

  const prisma = new PrismaClient();
  try {
    const readiness = await buildDeploymentReadiness(prisma, process.env);
    let frozen = null;
    if (hasFlag("--freeze")) {
      if (readiness.pilot?.readyForReadOnlyPreflight !== true) {
        const error = new Error(`Préflight non figé: blockers=${(readiness.pilot?.preflightBlockers || []).join(",") || "unknown"}`);
        error.code = "PREFLIGHT_NOT_READY";
        throw error;
      }
      frozen = await freezeDeploymentPreflight(prisma, readiness);
    }

    const now = new Date();
    const report = buildHandoffReport(readiness, frozen, now);
    const outputPath = reportPath(now);
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...report, reportPath: outputPath }, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, mode: "presence-vm-read-only-handoff", externalWritesPerformed: false, error: error.message, code: error.code || null }, null, 2));
  process.exitCode = 1;
});

module.exports = { buildHandoffReport, safeTimestamp };
