"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { run: runPreview } = require("./mse-25-30-network-preview");

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:4000";
const EXPECTED_BRANCH = "feature/mse-25-30-local-seo-optimizer";
const DEFAULT_VALIDATED_BASE_SHA = "4215eab0823161fed5dbbe2c33d3d1a15419ed2a";
const RUNTIME_PROTECTED_PATHS = Object.freeze([
  "backend/src/modules/minisite-seo-enrichment",
  "backend/scripts/mse-25-30-network-preview.js",
  "backend/scripts/mse-25-30-network-apply.js",
  "backend/scripts/mse-25-30-network-rollback.js",
  "backend/scripts/mse-25-30-post-rollout-validate.js",
]);
const REQUIRED_HEALTH_FLAGS = Object.freeze([
  "persistence",
  "deterministic",
  "versionedContentWrites",
  "networkSimilarityGuard",
  "preRolloutQualityGate",
  "sitemapReadinessGate",
  "networkRollbackSnapshots",
  "networkAutomaticCompensation",
]);
const DEFAULT_REPORT_DIR = path.join(os.homedir(), "mse-25-30-reports");

function normalizeOrigin(value) {
  return String(value || DEFAULT_BACKEND_ORIGIN).trim().replace(/\/+$/g, "");
}

function gitValue(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function gitSucceeds(args) {
  try {
    execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch (_error) {
    return false;
  }
}

function protectedChangesSince(validatedBaseSha, protectedPaths = RUNTIME_PROTECTED_PATHS) {
  if (!validatedBaseSha || !protectedPaths.length) return [];
  const output = gitValue([
    "diff",
    "--name-only",
    `${validatedBaseSha}...HEAD`,
    "--",
    ...protectedPaths,
  ]);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function repositoryState({
  validatedBaseSha = process.env.MSE_25_30_VALIDATED_BASE_SHA || DEFAULT_VALIDATED_BASE_SHA,
  protectedPaths = RUNTIME_PROTECTED_PATHS,
} = {}) {
  const branch = gitValue(["branch", "--show-current"]);
  const head = gitValue(["rev-parse", "HEAD"]);
  const dirty = Boolean(gitValue(["status", "--porcelain"]));
  const baselineAncestor = gitSucceeds(["merge-base", "--is-ancestor", validatedBaseSha, "HEAD"]);
  const protectedChanges = baselineAncestor
    ? protectedChangesSince(validatedBaseSha, protectedPaths)
    : [];

  return {
    branch,
    head,
    dirty,
    validatedBaseSha,
    baselineAncestor,
    protectedChanges,
  };
}

function assertRepositoryState(state, { expectedBranch = EXPECTED_BRANCH, allowDirty = false } = {}) {
  if (state.branch !== expectedBranch) {
    const error = new Error(`Branche active inattendue : ${state.branch || "(detached)"}. Attendu : ${expectedBranch}.`);
    error.code = "MSE_25_30_PREFLIGHT_BRANCH_MISMATCH";
    throw error;
  }
  if (state.dirty && !allowDirty) {
    const error = new Error("Le working tree doit être propre avant le preflight MSE-25.30.");
    error.code = "MSE_25_30_PREFLIGHT_DIRTY_WORKTREE";
    throw error;
  }
  if (state.baselineAncestor === false) {
    const error = new Error(`La baseline CI validée ${state.validatedBaseSha || "(inconnue)"} n'est pas un ancêtre du HEAD courant.`);
    error.code = "MSE_25_30_PREFLIGHT_BASELINE_MISMATCH";
    error.details = {
      head: state.head,
      validatedBaseSha: state.validatedBaseSha,
    };
    throw error;
  }
  if (Array.isArray(state.protectedChanges) && state.protectedChanges.length > 0) {
    const error = new Error("Le runtime MSE-25.30 a changé depuis la baseline CI validée. Une nouvelle validation CI est requise avant le preflight réseau.");
    error.code = "MSE_25_30_PREFLIGHT_RUNTIME_CHANGED";
    error.details = {
      head: state.head,
      validatedBaseSha: state.validatedBaseSha,
      protectedChanges: state.protectedChanges,
    };
    throw error;
  }
}

function assertHealth(health, requiredFlags = REQUIRED_HEALTH_FLAGS) {
  if (health?.status !== "ok" || health?.capability !== "minisite-seo-enrichment") {
    const error = new Error("Le backend ne signale pas une capacité minisite-seo-enrichment prête.");
    error.code = "MSE_25_30_PREFLIGHT_HEALTH_NOT_READY";
    error.details = health || null;
    throw error;
  }

  const missingCapabilities = requiredFlags.filter((flag) => health?.[flag] !== true);
  if (missingCapabilities.length > 0) {
    const error = new Error(`Le backend MSE-25.30 ne fournit pas toutes les garanties de rollout requises : ${missingCapabilities.join(", ")}.`);
    error.code = "MSE_25_30_PREFLIGHT_HEALTH_CAPABILITY_MISSING";
    error.details = {
      missingCapabilities,
      health,
    };
    throw error;
  }

  return health;
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  let payload = null;
  try { payload = await response.json(); } catch (_error) { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.code = payload?.error || "MSE_25_30_PREFLIGHT_HTTP_ERROR";
    error.statusCode = response.status;
    error.details = payload?.details || payload || {};
    throw error;
  }
  return payload;
}

function reportPath(value) {
  if (value) return path.resolve(value);
  const directory = path.resolve(process.env.MSE_25_30_REPORT_DIR || DEFAULT_REPORT_DIR);
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(directory, `mse-25-30-network-preview-${stamp}.json`);
}

async function run({ backendOrigin, tenantSlug, output, expectedBranch, allowDirty = false } = {}) {
  const repo = repositoryState();
  assertRepositoryState(repo, { expectedBranch: expectedBranch || process.env.MSE_25_30_EXPECTED_BRANCH || EXPECTED_BRANCH, allowDirty });

  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const tenant = String(tenantSlug || process.env.TENANT_SLUG || "mondescale").trim();
  const headers = { "x-tenant-slug": tenant };

  const health = await jsonRequest(`${origin}/minisite-seo-enrichment/health`, { headers });
  assertHealth(health);

  const preview = await runPreview({
    backendOrigin: origin,
    tenantSlug: tenant,
    emitOutput: false,
    setExitCode: false,
  });
  const file = reportPath(output || process.env.MSE_25_30_PREFLIGHT_OUTPUT);
  const report = {
    generatedAt: new Date().toISOString(),
    repository: repo,
    backend: { origin, tenant, health },
    preview,
  };
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + "\n", "utf8");

  const result = {
    ok: preview.rolloutBlocked !== true,
    rolloutBlocked: preview.rolloutBlocked === true,
    reportPath: file,
    repository: repo,
    previewSummary: preview.summary || {},
  };
  console.log(JSON.stringify(result, null, 2));
  if (result.rolloutBlocked) process.exitCode = 2;
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_30_PREFLIGHT_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_REPORT_DIR,
  DEFAULT_VALIDATED_BASE_SHA,
  EXPECTED_BRANCH,
  REQUIRED_HEALTH_FLAGS,
  RUNTIME_PROTECTED_PATHS,
  assertHealth,
  assertRepositoryState,
  gitSucceeds,
  jsonRequest,
  normalizeOrigin,
  protectedChangesSince,
  repositoryState,
  reportPath,
  run,
};
