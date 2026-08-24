"use strict";

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { buildDeploymentReadiness } = require("../src/modules/presence/deployment-readiness");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(JSON.stringify({ ok: false, error: "DATABASE_URL manquant", hint: "Exécuter depuis la VM backend avec l'environnement Local Engine chargé." }, null, 2));
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient();
  try {
    const readiness = await buildDeploymentReadiness(prisma, process.env);
    const output = {
      ok: readiness.pilot.readyForGooglePilot,
      mode: "presence-deployment-readiness",
      generatedAt: readiness.generatedAt,
      pilot: readiness.pilot,
      migrations: readiness.migrations,
      catalog: readiness.catalog.summary,
      network: readiness.network,
      operational: {
        readyForGoogleApi: readiness.operational.readyForGoogleApi,
        readyForGoogleManagedWrites: readiness.operational.readyForGoogleManagedWrites,
        googleWritesEnabled: readiness.operational.googleWritesEnabled,
        readyForDiscovery: readiness.operational.readyForDiscovery,
        blockers: readiness.operational.blockers,
        apiBlockers: readiness.operational.apiBlockers,
        warnings: readiness.operational.warnings
      },
      safety: {
        googleWriteKillSwitch: {
          env: "PRESENCE_GOOGLE_WRITES_ENABLED",
          enabled: readiness.operational.googleWritesEnabled === true,
          requiredForExternalWrites: true
        }
      }
    };
    console.log(JSON.stringify(output, null, 2));
    if (!output.ok) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
