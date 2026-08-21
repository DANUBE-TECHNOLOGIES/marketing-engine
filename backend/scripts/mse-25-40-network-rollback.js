"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const PageBuilderPersistenceService = require("../src/modules/page-builder-persistence/service");

function explicitTrue(value) { return value === true || String(value || "").trim().toLowerCase() === "true"; }
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function loadReport(file) {
  if (!file) { const e = new Error("Rapport de rollout MSE-25.40 requis."); e.code = "MSE_25_40_ROLLBACK_REPORT_REQUIRED"; throw e; }
  const resolved = path.resolve(file);
  return { file: resolved, report: JSON.parse(fs.readFileSync(resolved, "utf8")) };
}
function assertReport(report = {}) {
  if (report.type !== "mse-25.40-network-rollout-report" || !report.reportFingerprint || !Array.isArray(report.rollbackManifest)) {
    const e = new Error("Rapport de rollout MSE-25.40 invalide."); e.code = "MSE_25_40_ROLLBACK_REPORT_INVALID"; throw e;
  }
  if (report.proof?.noHomeScoreFilling !== true || report.proof?.automaticWrites !== false) {
    const e = new Error("Le rapport ne certifie pas les garde-fous MSE-25.40."); e.code = "MSE_25_40_ROLLBACK_REPORT_UNSAFE"; throw e;
  }
  const expected = digest({ type: report.type, context: report.context, proof: report.proof, result: report.result, rollbackManifest: report.rollbackManifest });
  if (String(report.reportFingerprint).toLowerCase() !== expected) {
    const e = new Error("Le rapport de rollout MSE-25.40 a été modifié après sa génération."); e.code = "MSE_25_40_ROLLBACK_REPORT_INTEGRITY_MISMATCH"; throw e;
  }
  return report;
}
async function serviceForReport(report, { prisma } = {}) {
  const client = prisma || new PrismaClient();
  const tenantSlug = report.context?.tenantSlug || "mondescale";
  const tenant = await client.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant?.id) { const e = new Error(`Tenant ${tenantSlug} introuvable.`); e.code = "MSE_25_40_TENANT_NOT_FOUND"; throw e; }
  return { service: new PageBuilderPersistenceService(client, tenant.id), prisma: client, ownsPrisma: !prisma };
}

async function run({ reportPath, confirm, approvedReportFingerprint, service, prisma, emitOutput = true } = {}) {
  const { file, report } = loadReport(reportPath || process.env.MSE_25_40_ROLLOUT_REPORT);
  assertReport(report);
  if (report.result?.writes !== true || report.result?.dryRun === true) {
    const e = new Error("Seul un rollout MSE-25.40 réellement écrit peut être rollbacké."); e.code = "MSE_25_40_ROLLBACK_NOT_APPLICABLE"; throw e;
  }
  if (!explicitTrue(confirm ?? process.env.MSE_25_40_CONFIRM_ROLLBACK)) {
    const e = new Error("Le rollback MSE-25.40 exige une confirmation explicite."); e.code = "MSE_25_40_ROLLBACK_CONFIRMATION_REQUIRED"; throw e;
  }
  const approved = String(approvedReportFingerprint || process.env.MSE_25_40_APPROVED_REPORT_FINGERPRINT || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(approved) || approved !== String(report.reportFingerprint).toLowerCase()) {
    const e = new Error("Le fingerprint du rapport de rollout approuvé est absent ou différent."); e.code = "MSE_25_40_ROLLBACK_REPORT_FINGERPRINT_MISMATCH"; throw e;
  }

  let persistence = { service, prisma, ownsPrisma: false };
  if (!service) persistence = await serviceForReport(report, { prisma });
  const restored = [];
  const failures = [];
  try {
    for (const entry of [...report.rollbackManifest].reverse()) {
      try {
        await persistence.service.rollback(entry.agencyId, entry.pageSlug, entry.rollbackVersionId, {
          createdBy: process.env.CREATED_BY || "mse-25.40-network-rollback",
          reason: "mse-25.40:operator-rollback",
        });
        restored.push({ agencyId: entry.agencyId, siteSlug: entry.siteSlug, pageSlug: entry.pageSlug, rollbackVersionId: entry.rollbackVersionId });
      } catch (cause) {
        failures.push({ agencyId: entry.agencyId, siteSlug: entry.siteSlug, pageSlug: entry.pageSlug, rollbackVersionId: entry.rollbackVersionId, error: cause.code || cause.name || "ROLLBACK_FAILED", message: cause.message });
      }
    }
  } finally {
    if (persistence.ownsPrisma && persistence.prisma) await persistence.prisma.$disconnect();
  }

  if (failures.length) { const e = new Error("Le rollback MSE-25.40 est incomplet."); e.code = "MSE_25_40_ROLLBACK_PARTIAL_FAILURE"; e.details = { restored, failures }; throw e; }
  const result = { ok: true, reportPath: file, reportFingerprint: report.reportFingerprint, restoredCount: restored.length, restored };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_40_ROLLBACK_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { assertReport, digest, explicitTrue, loadReport, run, serviceForReport };
