#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: previewNetwork } = require("./mse-25-40-network-preview");
const { buildSeoActionPlan } = require("../src/modules/minisite-semantic-engine/seo-action-plan");
const { qualifySeoSignals } = require("../src/modules/minisite-semantic-engine/seo-signal-qualification");
const { buildInternalLinkEvidence } = require("../src/modules/minisite-semantic-engine/internal-link-evidence");
const { buildInternalLinkProof } = require("../src/modules/minisite-semantic-engine/internal-link-proof");

async function fetchSourcePages(evidence, { tenantSlug = process.env.TENANT_SLUG || "mondescale", envFile = process.env.MSE_25_40_ENV_FILE } = {}) {
  const dotenv = require("dotenv");
  dotenv.config(envFile ? { path: envFile, quiet: true } : { quiet: true });
  const { PrismaClient } = require("@prisma/client");
  const PageBuilderPersistenceService = require("../src/modules/page-builder-persistence/service");
  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: String(tenantSlug).trim() } });
    if (!tenant?.id) throw Object.assign(new Error(`Tenant ${tenantSlug} introuvable.`), { code: "MSE_25_47_TENANT_NOT_FOUND" });
    const persistence = new PageBuilderPersistenceService(prisma, tenant.id);
    const rows = [];
    for (const item of evidence.items || []) {
      if (!item.preferredSource?.pageSlug) continue;
      const page = await persistence.get(item.agencyId, item.preferredSource.pageSlug);
      rows.push({ siteSlug: item.siteSlug, agencyId: item.agencyId, pageSlug: item.preferredSource.pageSlug, page });
    }
    return rows;
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const preview = await previewNetwork({ emitOutput: false });
  const qualification = qualifySeoSignals(preview);
  const actionPlan = buildSeoActionPlan(qualification);
  const evidence = buildInternalLinkEvidence(preview, actionPlan);
  const currentPages = await fetchSourcePages(evidence);
  const report = buildInternalLinkProof(evidence, currentPages);
  const reportDir = process.env.MSE_25_47_REPORT_DIR || process.env.MSE_25_40_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-47-internal-link-proof-${report.linkProofFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, readOnly: true, writes: false, reportPath, linkProofFingerprint: report.linkProofFingerprint, summary: report.summary }, null, 2));
  return report;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_47_LINK_PROOF_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { fetchSourcePages, run };
