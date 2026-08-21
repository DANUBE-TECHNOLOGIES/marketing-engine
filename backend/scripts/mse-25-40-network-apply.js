"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const PageBuilderPersistenceService = require("../src/modules/page-builder-persistence/service");
const { executeResidualWriteIntent } = require("../src/modules/minisite-semantic-engine/residual-executor");

function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function timestamp() { return new Date().toISOString().replace(/[:.]/g, "-"); }
function explicitTrue(value) { return value === true || String(value || "").trim().toLowerCase() === "true"; }
function loadJson(file, code) {
  if (!file) { const e = new Error("Fichier MSE-25.40 requis."); e.code = code; throw e; }
  const resolved = path.resolve(file);
  return { file: resolved, value: JSON.parse(fs.readFileSync(resolved, "utf8")) };
}
function defaultReportPath() {
  const directory = process.env.MSE_25_40_REPORT_DIR || "/home/admin1/mse-25-40-reports";
  return path.join(directory, `mse-25-40-network-rollout-${timestamp()}.json`);
}

function loadMseEnvironment(envFile = process.env.MSE_25_40_ENV_FILE) {
  const dotenv = require("dotenv");
  const options = { quiet: true };
  if (envFile) options.path = envFile;
  dotenv.config(options);
  if (!String(process.env.DATABASE_URL || "").trim()) {
    const e = new Error("DATABASE_URL introuvable après chargement de l'environnement MSE-25.40.");
    e.code = "MSE_25_40_DATABASE_URL_MISSING";
    throw e;
  }
  return { envFile: envFile ? path.resolve(envFile) : null, databaseUrlLoaded: true };
}

async function persistenceServiceForTenant(tenantSlug, { prisma, envFile } = {}) {
  if (!prisma) loadMseEnvironment(envFile);
  const client = prisma || new PrismaClient();
  const tenant = await client.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant?.id) { const e = new Error(`Tenant ${tenantSlug} introuvable.`); e.code = "MSE_25_40_TENANT_NOT_FOUND"; throw e; }
  return { service: new PageBuilderPersistenceService(client, tenant.id), prisma: client, ownsPrisma: !prisma, tenantId: tenant.id };
}

function assertPlanChain(writeIntent, residualPlan) {
  if (writeIntent.residualExecutionFingerprint !== residualPlan.residualExecutionFingerprint) {
    const e = new Error("Le write-intent ne correspond pas au plan résiduel approuvé.");
    e.code = "MSE_25_40_APPLY_PLAN_CHAIN_MISMATCH";
    throw e;
  }
  if (residualPlan.policy?.noHomeScoreFilling !== true || residualPlan.policy?.automaticWrites !== false) {
    const e = new Error("Les garde-fous du plan résiduel ne sont pas certifiés.");
    e.code = "MSE_25_40_APPLY_PLAN_UNSAFE";
    throw e;
  }
  if ((writeIntent.intents || []).some((intent) => intent.pageSlug === "home" && (intent.persistence?.body?.blocks || []).some((block) => block.seo?.generatedBy === "mse-25.40" && block.seo?.purpose === "residual-semantic-uplift"))) {
    const e = new Error("Le write-intent contient un enrichissement secondaire interdit de la home.");
    e.code = "MSE_25_40_APPLY_HOME_FILL_FORBIDDEN";
    throw e;
  }
}

async function run({ writeIntentPath, residualPlanPath, confirm, approvedWriteIntentFingerprint, dryRun = true, tenantSlug, reportPath, service, prisma, emitOutput = true, envFile = process.env.MSE_25_40_ENV_FILE } = {}) {
  const writeSource = writeIntentPath || process.env.MSE_25_40_WRITE_INTENT;
  const residualSource = residualPlanPath || process.env.MSE_25_40_RESIDUAL_PLAN;
  const { file: writeFile, value: writeIntent } = loadJson(writeSource, "MSE_25_40_APPLY_WRITE_INTENT_REQUIRED");
  const { file: residualFile, value: residualPlan } = loadJson(residualSource, "MSE_25_40_APPLY_RESIDUAL_REQUIRED");
  assertPlanChain(writeIntent, residualPlan);

  const approved = approvedWriteIntentFingerprint || process.env.MSE_25_40_APPROVED_WRITE_INTENT_FINGERPRINT;
  const effectiveTenant = String(tenantSlug || process.env.TENANT_SLUG || "mondescale").trim();
  const effectiveConfirm = confirm ?? process.env.MSE_25_40_CONFIRM;
  if (dryRun === false && !explicitTrue(effectiveConfirm)) {
    const e = new Error("L'écriture réelle MSE-25.40 exige MSE_25_40_CONFIRM=true.");
    e.code = "MSE_25_40_APPLY_CONFIRMATION_REQUIRED";
    throw e;
  }

  let persistence = { service, prisma, ownsPrisma: false, tenantId: null };
  if (!service && dryRun === false) persistence = await persistenceServiceForTenant(effectiveTenant, { prisma, envFile });
  const noWriteService = service || {
    get: async () => ({}),
    save: async () => ({}),
    versions: async () => ({ items: [] }),
    rollback: async () => ({}),
  };

  try {
    const result = await executeResidualWriteIntent({
      writeIntent,
      service: persistence.service || noWriteService,
      dryRun,
      confirm: effectiveConfirm,
      approvedWriteIntentFingerprint: approved,
      metadata: {
        createdBy: process.env.CREATED_BY || "mse-25.40-network-rollout",
        reason: "mse-25.40:residual-semantic-rollout",
        tenantId: persistence.tenantId || null,
      },
    });

    const report = {
      type: "mse-25.40-network-rollout-report",
      generatedAt: new Date().toISOString(),
      context: { tenantSlug: effectiveTenant, tenantId: persistence.tenantId || null },
      proof: {
        residualPlanPath: residualFile,
        writeIntentPath: writeFile,
        sourcePlanFingerprint: residualPlan.sourcePlanFingerprint,
        consolidatedExecutionFingerprint: residualPlan.consolidatedExecutionFingerprint,
        residualExecutionFingerprint: residualPlan.residualExecutionFingerprint,
        writeIntentFingerprint: writeIntent.writeIntentFingerprint,
        noHomeScoreFilling: residualPlan.policy.noHomeScoreFilling === true,
        automaticWrites: residualPlan.policy.automaticWrites,
      },
      result,
      rollbackManifest: result.rollbackManifest || [],
    };
    report.reportFingerprint = digest({ type: report.type, context: report.context, proof: report.proof, result: report.result, rollbackManifest: report.rollbackManifest });
    const target = path.resolve(reportPath || process.env.MSE_25_40_ROLLOUT_REPORT || defaultReportPath());
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(report, null, 2) + "\n", "utf8");

    const output = {
      ok: result.ok === true,
      dryRun: result.dryRun === true,
      writes: result.writes === true,
      publicWrites: result.publicWrites === true,
      pagesWritten: result.pagesWritten || 0,
      rollbackSnapshots: result.rollbackSnapshots || 0,
      residualExecutionFingerprint: residualPlan.residualExecutionFingerprint,
      writeIntentFingerprint: writeIntent.writeIntentFingerprint,
      reportFingerprint: report.reportFingerprint,
      reportPath: target,
    };
    if (emitOutput) console.log(JSON.stringify(output, null, 2));
    return { ...output, report };
  } finally {
    if (persistence.ownsPrisma && persistence.prisma) await persistence.prisma.$disconnect();
  }
}

if (require.main === module) {
  run({ dryRun: String(process.env.MSE_25_40_DRY_RUN || "true").toLowerCase() !== "false" }).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_40_NETWORK_APPLY_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { assertPlanChain, defaultReportPath, digest, explicitTrue, loadJson, loadMseEnvironment, persistenceServiceForTenant, run };
