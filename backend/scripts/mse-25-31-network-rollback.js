"use strict";

const { PrismaClient } = require("@prisma/client");
const PageBuilderPersistenceService = require("../src/modules/page-builder-persistence/service");
const { assertRolloutReport, loadReport } = require("./mse-25-31-rollout-report-check");

function explicitTrue(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

async function serviceForReport(report, { prisma } = {}) {
  const client = prisma || new PrismaClient();
  const tenantSlug = report.context?.tenantSlug || "mondescale";
  const tenant = await client.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant?.id) {
    const error = new Error(`Tenant ${tenantSlug} introuvable.`);
    error.code = "MSE_25_31_TENANT_NOT_FOUND";
    throw error;
  }
  return { service: new PageBuilderPersistenceService(client, tenant.id), prisma: client, ownsPrisma: !prisma };
}

async function run({ reportPath, confirm, approvedReportFingerprint, service, prisma, emitOutput = true } = {}) {
  const { file, report } = loadReport(reportPath);
  const verified = assertRolloutReport(report);
  if (report.result?.writes !== true || report.result?.dryRun === true) {
    const error = new Error("Seul un rollout MSE-25.31 réellement écrit peut être rollbacké.");
    error.code = "MSE_25_31_ROLLBACK_NOT_APPLICABLE";
    throw error;
  }
  if (!explicitTrue(confirm ?? process.env.MSE_25_31_CONFIRM_ROLLBACK)) {
    const error = new Error("Le rollback MSE-25.31 exige une confirmation explicite.");
    error.code = "MSE_25_31_ROLLBACK_CONFIRMATION_REQUIRED";
    throw error;
  }
  const approved = String(approvedReportFingerprint || process.env.MSE_25_31_APPROVED_REPORT_FINGERPRINT || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(approved) || approved !== verified.reportFingerprint) {
    const error = new Error("Le fingerprint du rapport de rollout approuvé est absent ou différent.");
    error.code = "MSE_25_31_ROLLBACK_REPORT_FINGERPRINT_MISMATCH";
    throw error;
  }

  let persistence = { service, prisma, ownsPrisma: false };
  if (!service) persistence = await serviceForReport(report, { prisma });
  const restored = [];
  const failures = [];
  try {
    for (const entry of [...report.rollbackManifest].reverse()) {
      try {
        await persistence.service.rollback(
          entry.agencyId,
          entry.pageSlug,
          entry.rollbackVersionId,
          {
            createdBy: process.env.CREATED_BY || "mse-25.31-network-rollback",
            reason: "mse-25.31:operator-rollback",
          }
        );
        restored.push({
          agencyId: entry.agencyId,
          siteSlug: entry.siteSlug,
          pageSlug: entry.pageSlug,
          rollbackVersionId: entry.rollbackVersionId,
        });
      } catch (error) {
        failures.push({
          agencyId: entry.agencyId,
          siteSlug: entry.siteSlug,
          pageSlug: entry.pageSlug,
          rollbackVersionId: entry.rollbackVersionId,
          error: error.code || error.name || "ROLLBACK_FAILED",
          message: error.message,
        });
      }
    }
  } finally {
    if (persistence.ownsPrisma && persistence.prisma) await persistence.prisma.$disconnect();
  }

  if (failures.length) {
    const error = new Error("Le rollback MSE-25.31 est incomplet.");
    error.code = "MSE_25_31_ROLLBACK_PARTIAL_FAILURE";
    error.details = { restored, failures };
    throw error;
  }

  const result = {
    ok: true,
    reportPath: file,
    reportFingerprint: verified.reportFingerprint,
    restoredCount: restored.length,
    restored,
  };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_31_ROLLBACK_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { explicitTrue, run, serviceForReport };
