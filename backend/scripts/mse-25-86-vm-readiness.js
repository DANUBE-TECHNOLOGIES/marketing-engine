#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const { run: runRemediation } = require("./mse-25-86-seo-coverage-remediation");

const EXPECTED_BRANCH = "feature/mse-25-86-seo-coverage-remediation-on-85-20260828";
const DEFAULT_REPORT_DIR = "/home/admin1/mse-25-86-reports";

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

function previewReports(reportDir) {
  if (!fs.existsSync(reportDir)) return new Set();
  return new Set(
    fs.readdirSync(reportDir)
      .filter((name) => /^mse-25-86-preview-.*\.json$/.test(name))
      .map((name) => path.resolve(reportDir, name))
  );
}

function findCreatedPreview(reportDir, before) {
  if (!fs.existsSync(reportDir)) return null;
  const candidates = fs.readdirSync(reportDir)
    .filter((name) => /^mse-25-86-preview-.*\.json$/.test(name))
    .map((name) => path.resolve(reportDir, name))
    .filter((file) => !before.has(file))
    .map((file) => ({ file, mtimeMs: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.file || null;
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

function readinessBlockers(checks) {
  const messages = {
    expectedBranch: `Branche attendue: ${EXPECTED_BRANCH}`,
    cleanWorktree: "Worktree Git non propre",
    databaseUrlAvailable: "DATABASE_URL indisponible",
    databaseConnected: "Connexion Prisma non validée",
    tenantFound: "Tenant mondescale non validé",
    previewReadOnly: "Preview non certifié read-only",
    nineSites: "Le preview ne couvre pas exactement 9 sites",
    projectedCoverageGate: "Au moins une projection SEO requise n'atteint pas strong",
    noFrontendSurface: "Surface frontend/hero détectée dans le plan",
    noStructuralMutation: "Mutation structurelle détectée dans le plan",
    previewReportPersisted: "Rapport JSON de preview non retrouvé",
  };
  return Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([key]) => ({ check: key, message: messages[key] || `Contrôle ${key} non validé` }));
}

async function run({ emitOutput = true } = {}) {
  const environment = loadBackendEnvironment();
  const repository = repositoryState();
  const tenantSlug = process.env.TENANT_SLUG || "mondescale";
  const reportDir = process.env.MSE_25_86_REPORT_DIR || DEFAULT_REPORT_DIR;
  const checks = {
    expectedBranch: repository.branch === EXPECTED_BRANCH,
    cleanWorktree: repository.dirty === false,
    databaseUrlAvailable: Boolean(process.env.DATABASE_URL),
  };

  let database = null;
  let preview = null;
  let previewReportPath = null;

  if (checks.expectedBranch && checks.cleanWorktree && checks.databaseUrlAvailable) {
    database = await databaseReadiness({ tenantSlug });
    checks.databaseConnected = database.connected === true;
    checks.tenantFound = database.tenantSlug === tenantSlug;

    const beforeReports = previewReports(reportDir);
    preview = await runRemediation({ dryRun: true, tenantSlug, reportDir });
    previewReportPath = findCreatedPreview(reportDir, beforeReports);

    checks.previewReadOnly = preview?.dryRun === true && preview?.writes === false;
    checks.nineSites = Array.isArray(preview?.sites) && preview.sites.length === 9;
    checks.projectedCoverageGate = preview?.projectedCoverageGate === true && preview?.allProjectedRequiredIntentsStrong === true;
    checks.noFrontendSurface = preview?.frontendFilesTouched === 0 && preview?.heroBodyTextTouched === 0;
    checks.noStructuralMutation = preview?.structuralBlocksCreated === 0 && preview?.structuralBlocksDeleted === 0;
    checks.previewReportPersisted = Boolean(previewReportPath && fs.existsSync(previewReportPath));
  }

  const blockers = readinessBlockers(checks);
  const readyForApplyReview = blockers.length === 0;
  const result = {
    version: "mse-25.86",
    ok: readyForApplyReview,
    verdict: readyForApplyReview ? "READY_FOR_APPLY_REVIEW" : "BLOCKED",
    readyForApplyReview,
    writes: false,
    readOnly: true,
    expectedBranch: EXPECTED_BRANCH,
    environment: { loaded: environment.loaded, source: environment.source },
    repository,
    database,
    reportDir,
    previewReportPath,
    checks,
    blockers,
    preview: preview ? {
      sites: preview.sites,
      projections: preview.projections,
      changes: preview.changes,
      reportGenerated: Boolean(previewReportPath),
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
      verdict: "BLOCKED",
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
  DEFAULT_REPORT_DIR,
  repositoryState,
  loadBackendEnvironment,
  previewReports,
  findCreatedPreview,
  databaseReadiness,
  readinessBlockers,
  run,
};
