#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const { run: runRemediation } = require("./mse-25-86-seo-coverage-remediation");

const EXPECTED_BRANCH = "feature/mse-25-86-seo-coverage-remediation-on-85-20260828";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function repositoryState() {
  return {
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "HEAD"]),
    dirty: Boolean(git(["status", "--porcelain"])),
  };
}

function loadBackendEnvironment() {
  if (process.env.DATABASE_URL) return { source: "process", loaded: true };
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.production"),
    path.resolve(__dirname, "..", ".env"),
    path.resolve(__dirname, "..", ".env.production"),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const result = dotenv.config({ path: candidate, override: false });
    if (!result.error && process.env.DATABASE_URL) {
      return { source: candidate, loaded: true };
    }
  }
  return { source: null, loaded: false };
}

async function databaseReadiness({ tenantSlug = process.env.TENANT_SLUG || "mondescale" } = {}) {
  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true, slug: true } });
    if (!tenant?.id) throw new Error(`Tenant ${tenantSlug} introuvable.`);
    const siteCount = await prisma.agencySite.count({ where: { tenantId: tenant.id } });
    return { connected: true, tenantSlug: tenant.slug, siteCount };
  } finally {
    await prisma.$disconnect();
  }
}

async function run({ emitOutput = true } = {}) {
  const environment = loadBackendEnvironment();
  const repository = repositoryState();
  const checks = {
    expectedBranch: repository.branch === EXPECTED_BRANCH,
    cleanWorktree: repository.dirty === false,
    databaseUrlAvailable: Boolean(process.env.DATABASE_URL),
  };

  let database = null;
  let preview = null;

  if (checks.expectedBranch && checks.cleanWorktree && checks.databaseUrlAvailable) {
    database = await databaseReadiness();
    checks.databaseConnected = database.connected === true;
    checks.tenantFound = database.tenantSlug === (process.env.TENANT_SLUG || "mondescale");
    preview = await runRemediation({ dryRun: true });
    checks.previewReadOnly = preview?.dryRun === true && preview?.writes === false;
    checks.nineSites = Array.isArray(preview?.sites) && preview.sites.length === 9;
    checks.projectedCoverageGate = preview?.projectedCoverageGate === true && preview?.allProjectedRequiredIntentsStrong === true;
    checks.noFrontendSurface = preview?.frontendFilesTouched === 0 && preview?.heroBodyTextTouched === 0;
    checks.noStructuralMutation = preview?.structuralBlocksCreated === 0 && preview?.structuralBlocksDeleted === 0;
  }

  const readyForApplyReview = Object.values(checks).every(Boolean);
  const result = {
    version: "mse-25.86",
    ok: readyForApplyReview,
    readyForApplyReview,
    writes: false,
    readOnly: true,
    expectedBranch: EXPECTED_BRANCH,
    environment: { loaded: environment.loaded, source: environment.source },
    repository,
    database,
    checks,
    preview: preview ? {
      sites: preview.sites,
      projections: preview.projections,
      changes: preview.changes,
      reportGenerated: true,
    } : null,
  };

  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  if (!readyForApplyReview) process.exitCode = 1;
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      version: "mse-25.86",
      readOnly: true,
      writes: false,
      error: "MSE_25_86_VM_READINESS_FAILED",
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  EXPECTED_BRANCH,
  repositoryState,
  loadBackendEnvironment,
  databaseReadiness,
  run,
};
