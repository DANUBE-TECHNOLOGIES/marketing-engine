"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const PageBuilderPersistenceService = require("../src/modules/page-builder-persistence/service");
const { loadJson } = require("./mse-25-31-approval-check");
const { loadReport } = require("./mse-25-31-preflight-check");
const { assertApplyAuthorization } = require("./mse-25-31-apply-gate");
const { repositoryState, EXPECTED_BRANCH } = require("./mse-25-31-preflight");
const { run: checkWriteIntent } = require("./mse-25-31-write-intent-check");
const { executeQualityUpliftWriteIntent } = require("../src/modules/minisite-seo-enrichment/quality-uplift-executor");

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function defaultReportPath() {
  const directory = process.env.MSE_25_31_REPORT_DIR || "/home/admin1/mse-25-31-reports";
  return path.join(directory, `mse-25-31-network-rollout-${timestamp()}.json`);
}

async function persistenceServiceForTenant(tenantSlug, { prisma } = {}) {
  const client = prisma || new PrismaClient();
  const tenant = await client.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant?.id) {
    const error = new Error(`Tenant ${tenantSlug} introuvable.`);
    error.code = "MSE_25_31_TENANT_NOT_FOUND";
    throw error;
  }
  return { service: new PageBuilderPersistenceService(client, tenant.id), prisma: client, ownsPrisma: !prisma, tenantId: tenant.id };
}

async function run({
  executionPlanPath,
  approvalManifestPath,
  preflightReportPath,
  writeIntentPath,
  confirm,
  approvedExecutionPlanFingerprint,
  approvedWriteIntentFingerprint,
  dryRun = true,
  backendOrigin,
  tenantSlug,
  reportPath,
  emitOutput = true,
  repositoryReader = repositoryState,
  request,
  service,
  prisma,
} = {}) {
  const executionSource = executionPlanPath || process.env.MSE_25_31_EXECUTION_PLAN;
  const approvalSource = approvalManifestPath || process.env.MSE_25_31_APPROVAL_MANIFEST;
  const preflightSource = preflightReportPath || process.env.MSE_25_31_PREFLIGHT_REPORT;
  const writeIntentSource = writeIntentPath || process.env.MSE_25_31_WRITE_INTENT;

  const { value: executionPlan } = loadJson(executionSource, "MSE_25_31_EXECUTION_PLAN_NOT_FOUND");
  const { value: approvalManifest } = loadJson(approvalSource, "MSE_25_31_APPROVAL_MANIFEST_NOT_FOUND");
  const { report: preflightReport } = loadReport(preflightSource);
  const { value: writeIntent } = loadJson(writeIntentSource, "MSE_25_31_WRITE_INTENT_NOT_FOUND");

  const repository = repositoryReader();
  const applyAuthorization = assertApplyAuthorization({
    executionPlan,
    approvalManifest,
    preflightReport,
    repository,
    confirm: confirm ?? process.env.MSE_25_31_CONFIRM,
    approvedExecutionPlanFingerprint: approvedExecutionPlanFingerprint || process.env.MSE_25_31_APPROVED_EXECUTION_FINGERPRINT,
    expectedBranch: process.env.MSE_25_31_EXPECTED_BRANCH || EXPECTED_BRANCH,
  });

  const writeIntentCheck = await checkWriteIntent({
    writeIntentPath: writeIntentSource,
    executionPlanPath: executionSource,
    approvalManifestPath: approvalSource,
    preflightReportPath: preflightSource,
    backendOrigin: backendOrigin || process.env.BACKEND_ORIGIN || preflightReport.context?.backendOrigin,
    tenantSlug: tenantSlug || process.env.TENANT_SLUG || preflightReport.context?.tenantSlug,
    emitOutput: false,
    ...(request ? { request } : {}),
  });

  const approvedWriteFingerprint = approvedWriteIntentFingerprint || process.env.MSE_25_31_APPROVED_WRITE_INTENT_FINGERPRINT;
  let persistence = { service, prisma, ownsPrisma: false, tenantId: null };
  const effectiveTenantSlug = tenantSlug || process.env.TENANT_SLUG || preflightReport.context?.tenantSlug || "mondescale";
  if (!service && dryRun === false) persistence = await persistenceServiceForTenant(effectiveTenantSlug, { prisma });

  try {
    const result = await executeQualityUpliftWriteIntent({
      writeIntent,
      service: persistence.service || {
        get: async () => ({}),
        save: async () => ({}),
        rollback: async () => ({}),
      },
      dryRun,
      confirm: confirm ?? process.env.MSE_25_31_CONFIRM,
      approvedWriteIntentFingerprint: approvedWriteFingerprint,
      metadata: {
        createdBy: process.env.CREATED_BY || "mse-25.31-network-rollout",
        reason: "mse-25.31:quality-uplift-rollout",
        tenantId: persistence.tenantId || null,
      },
    });

    const report = {
      type: "mse-25.31-network-rollout-report",
      generatedAt: new Date().toISOString(),
      repository,
      context: {
        backendOrigin: backendOrigin || process.env.BACKEND_ORIGIN || preflightReport.context?.backendOrigin || null,
        tenantSlug: effectiveTenantSlug,
        tenantId: persistence.tenantId || null,
      },
      proof: {
        applyAuthorization,
        writeIntentCheck,
        preflightPlanFingerprint: preflightReport.planFingerprint,
        executionPlanFingerprint: executionPlan.executionPlanFingerprint,
        writeIntentFingerprint: writeIntent.writeIntentFingerprint,
      },
      result,
      rollbackManifest: result.rollbackManifest || [],
    };
    report.reportFingerprint = digest({
      type: report.type,
      repository: report.repository,
      context: report.context,
      proof: report.proof,
      result: report.result,
      rollbackManifest: report.rollbackManifest,
    });

    const target = path.resolve(reportPath || process.env.MSE_25_31_ROLLOUT_REPORT || defaultReportPath());
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(report, null, 2) + "\n", "utf8");

    const output = {
      ok: result.ok === true,
      dryRun: result.dryRun === true,
      writes: result.writes === true,
      publicWrites: result.publicWrites === true,
      pagesWritten: result.pagesWritten || 0,
      rollbackSnapshots: result.rollbackSnapshots || 0,
      executionPlanFingerprint: executionPlan.executionPlanFingerprint,
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
  run({ dryRun: String(process.env.MSE_25_31_DRY_RUN || "true").toLowerCase() !== "false" }).catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_31_NETWORK_APPLY_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { defaultReportPath, digest, persistenceServiceForTenant, run };
