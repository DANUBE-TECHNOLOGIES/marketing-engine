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
        readyForGoogleManagedWrites: readiness.operational.readyForGoogleManagedWrites,
        readyForDiscovery: readiness.operational.readyForDiscovery,
        blockers: readiness.operational.blockers,
        warnings: readiness.operational.warnings
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
