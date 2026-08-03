"use strict";

const path = require("node:path");

const {
  auditMigrations,
} = require("../prisma/audit");

const {
  createHtmlReport,
} = require("../prisma/report");

function printAudit(audit) {
  console.log("");
  console.log("Prisma Migration Audit");
  console.log("======================");
  console.log(
    `Migrations : ${audit.migrationCount}`
  );
  console.log(
    `Tables détectées : ${audit.tableCount}`
  );
  console.log(
    `Erreurs : ${audit.issues.length}`
  );
  console.log(
    `Avertissements : ${audit.warnings.length}`
  );
  console.log("");

  for (const issue of audit.issues) {
    console.log(
      `✗ ${issue.migration} — ${issue.table}`
    );
    console.log(`  ${issue.message}`);
  }

  for (const warning of audit.warnings) {
    console.log(
      `! ${warning.migration} — ${warning.table}`
    );
    console.log(`  ${warning.message}`);
  }

  if (audit.valid) {
    console.log(
      "✓ Aucune dépendance invalide détectée."
    );
  }
}

async function prismaCommand({
  root,
  logger,
  args,
}) {
  const subcommand =
    String(args[0] || "help")
      .trim()
      .toLowerCase();

  if (subcommand !== "audit") {
    console.log(`
Usage:
  ./mondescale prisma audit

Commandes:
  audit   Analyse l’ordre des migrations SQL Prisma
`);
    return;
  }

  const audit = auditMigrations(root);
  const report = createHtmlReport(
    root,
    audit
  );

  printAudit(audit);

  console.log("");
  console.log(
    `Rapport : ${path.relative(root, report)}`
  );

  logger.info(
    "Audit Prisma terminé",
    {
      valid: audit.valid,
      migrationCount:
        audit.migrationCount,
      issueCount:
        audit.issues.length,
      warningCount:
        audit.warnings.length,
      report,
    }
  );

  if (!audit.valid) {
    const error = new Error(
      `${audit.issues.length} erreur(s) de dépendance détectée(s).`
    );

    error.code =
      "PRISMA_MIGRATION_AUDIT_FAILED";

    throw error;
  }
}

module.exports = prismaCommand;
