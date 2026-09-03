"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const {
  TravelCoreImporter,
} = require("../src/modules/travel-core/importer");

const prisma = new PrismaClient();

class DryRunRollback extends Error {
  constructor(result) {
    super("TRAVEL_CORE_DRY_RUN_ROLLBACK");
    this.name = "DryRunRollback";
    this.result = result;
  }
}

function loadJson(fileName) {
  const filePath = path.join(
    __dirname,
    "..",
    "data",
    "travel-core",
    fileName
  );

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function executeImports(client, tenant, dryRun) {
  const importer = new TravelCoreImporter(client, tenant.id);

  const imports = [
    ["countries", "countries.json"],
    ["regions", "regions.json"],
    ["cities", "cities.json"],
    ["destinations", "destinations.json"],
  ];

  const reports = [];

  for (const [entityType, fileName] of imports) {
    /*
     * Dans la transaction de dry-run, on autorise les écritures afin que
     * les entités suivantes puissent résoudre leurs relations.
     * La transaction complète sera annulée ensuite.
     */
    const report = await importer.import({
      entityType,
      format: "json",
      dryRun: false,
      data: loadJson(fileName),
    });

    reports.push({
      ...report,
      dryRun,
    });

    console.log(
      `[TRAVEL CORE] ${entityType}: ` +
        `${report.created} created, ` +
        `${report.updated} updated, ` +
        `${report.failed} failed`
    );

    if (report.failed > 0) {
      console.error(JSON.stringify(report.errors, null, 2));
      throw new Error(`Échec de l'import ${entityType}`);
    }
  }

  return {
    ok: true,
    tenant: tenant.slug,
    dryRun,
    reports,
  };
}

async function main() {
  const tenantSlug =
    process.env.TRAVEL_CORE_TENANT_SLUG || "mondescale";

  const dryRun =
    String(process.env.TRAVEL_CORE_DRY_RUN || "true").toLowerCase() !==
    "false";

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    throw new Error(`Tenant introuvable : ${tenantSlug}`);
  }

  if (dryRun) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const result = await executeImports(tx, tenant, true);

          /*
           * Une exception volontaire provoque le rollback intégral.
           */
          throw new DryRunRollback(result);
        },
        {
          maxWait: 10000,
          timeout: 60000,
        }
      );
    } catch (error) {
      if (error instanceof DryRunRollback) {
        console.log(JSON.stringify(error.result, null, 2));
        console.log(
          "[TRAVEL CORE] Dry-run terminé : aucune donnée conservée."
        );
        return;
      }

      throw error;
    }

    return;
  }

  const result = await executeImports(prisma, tenant, false);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
