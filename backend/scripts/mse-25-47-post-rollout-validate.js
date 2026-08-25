#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const PageBuilderPersistenceService = require("../src/modules/page-builder-persistence/service");
const { run: previewNetwork } = require("./mse-25-40-network-preview");
const { buildPostRolloutValidation } = require("../src/modules/minisite-semantic-engine/internal-link-post-rollout-validation");

function load(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

async function fetchCurrentPages(rollout, { tenantSlug = process.env.TENANT_SLUG || "mondescale", envFile = process.env.MSE_25_40_ENV_FILE } = {}) {
  const dotenv = require("dotenv");
  dotenv.config(envFile ? { path: envFile, quiet: true } : { quiet: true });
  if (!String(process.env.DATABASE_URL || "").trim()) throw Object.assign(new Error("DATABASE_URL introuvable."), { code: "MSE_25_47_DATABASE_URL_MISSING" });
  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: String(tenantSlug).trim() } });
    if (!tenant?.id) throw Object.assign(new Error(`Tenant ${tenantSlug} introuvable.`), { code: "MSE_25_47_TENANT_NOT_FOUND" });
    const persistence = new PageBuilderPersistenceService(prisma, tenant.id);
    const manifest = rollout.rollbackManifest || rollout.result?.rollbackManifest || [];
    const rows = [];
    for (const row of manifest) {
      const page = await persistence.get(row.agencyId, row.pageSlug);
      rows.push({ siteSlug: row.siteSlug, agencyId: row.agencyId, pageSlug: row.pageSlug, page });
    }
    return rows;
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const rolloutPath = process.env.MSE_25_47_ROLLOUT_REPORT;
  if (!rolloutPath) throw Object.assign(new Error("MSE_25_47_ROLLOUT_REPORT requis."), { code: "MSE_25_47_POST_ROLLOUT_REQUIRED" });
  const rollout = load(rolloutPath);
  const currentPages = await fetchCurrentPages(rollout);
  const preview = await previewNetwork({ emitOutput: false });
  const report = buildPostRolloutValidation({ rollout, currentPages, preview });
  report.sourcePlanFingerprint = preview.planFingerprint;
  report.validationFingerprint = require("../src/modules/minisite-semantic-engine/internal-link-post-rollout-validation").digest({ ...report, validationFingerprint: undefined });
  const dir = process.env.MSE_25_47_REPORT_DIR || "/tmp";
  fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, `mse-25-47-post-rollout-${report.validationFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (!report.summary.closureCertified) {
    const error = new Error("La clôture MSE-25.47 n'est pas certifiée sur les liens persistés.");
    error.code = "MSE_25_47_POST_ROLLOUT_NOT_CERTIFIED";
    error.details = { reportPath, summary: report.summary, targets: report.targets };
    throw error;
  }
  console.log(JSON.stringify({ ok: true, readOnly: true, writes: false, closureCertified: true, reportPath, validationFingerprint: report.validationFingerprint, summary: report.summary }, null, 2));
  return report;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_47_POST_ROLLOUT_FAILED", message: error.message, details: error.details || {} }, null, 2));
  process.exitCode = 1;
});

module.exports = { fetchCurrentPages, run };
