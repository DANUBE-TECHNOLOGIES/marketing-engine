"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { run: runPreview } = require("./mse-25-30-network-preview");

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:4000";
const EXPECTED_BRANCH = "feature/mse-25-30-local-seo-optimizer";
const DEFAULT_VALIDATED_BASE_SHA = "04c869acf5d813f899689670da69a70c3ee4e2e0";
const GITHUB_REPOSITORY = "DANUBE-TECHNOLOGIES/marketing-engine";
const GITHUB_WORKFLOW_ID = 334395003;
const GITHUB_WORKFLOW_NAME = "MSE-25 Search Console and indexation checks";
const DEFAULT_GITHUB_API_ORIGIN = "https://api.github.com";
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const RUNTIME_PROTECTED_PATHS = Object.freeze([
  "backend/package.json",
  "backend/src/modules/minisite-seo-enrichment",
  "backend/scripts/mse-25-30-preflight.js",
  "backend/scripts/mse-25-30-network-preview.js",
  "backend/scripts/mse-25-30-network-apply.js",
  "backend/scripts/mse-25-30-network-rollback.js",
  "backend/scripts/mse-25-30-post-rollout-validate.js",
  "backend/scripts/mse-25-30-public-html-check.js",
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
  "noindexContentWriteGuard",
  "managedRouteContentWriteGuard",
  "editorialHardening",
  "emptyIndexableContentGuard",
  "networkAgencyExclusionGuard",
  "deterministicAgencyDifferentiation",
  "approvedPlanFingerprintGuard",
]);
const DEFAULT_REPORT_DIR = path.join(os.homedir(), "mse-25-30-reports");

function normalizeOrigin(value) {
  return String(value || DEFAULT_BACKEND_ORIGIN).trim().replace(/\/+$/g, "");
}

function normalizeGithubApiOrigin(value) {
  return String(value || DEFAULT_GITHUB_API_ORIGIN).trim().replace(/\/+$/g, "");
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

function baselineWorkflowRunsUrl(validatedBaseSha, {
  githubApiOrigin = DEFAULT_GITHUB_API_ORIGIN,
  repository = GITHUB_REPOSITORY,
  workflowId = GITHUB_WORKFLOW_ID,
} = {}) {
  const sha = String(validatedBaseSha || "").trim().toLowerCase();
  if (!COMMIT_SHA_PATTERN.test(sha)) {
    const error = new Error("La baseline MSE-25.30 doit être une SHA Git complète de 40 caractères.");
    error.code = "MSE_25_30_PREFLIGHT_BASELINE_SHA_INVALID";
    error.details = { validatedBaseSha: validatedBaseSha || null };
    throw error;
  }
  const apiOrigin = normalizeGithubApiOrigin(githubApiOrigin);
  return `${apiOrigin}/repos/${repository}/actions/workflows/${workflowId}/runs?head_sha=${encodeURIComponent(sha)}&status=success&per_page=10`;
}

function selectSuccessfulBaselineRun(payload, validatedBaseSha, {
  expectedBranch = EXPECTED_BRANCH,
  workflowName = GITHUB_WORKFLOW_NAME,
} = {}) {
  const sha = String(validatedBaseSha || "").trim().toLowerCase();
  const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
  const run = runs.find((item) =>
    String(item?.head_sha || "").trim().toLowerCase() === sha
    && item?.status === "completed"
    && item?.conclusion === "success"
    && item?.name === workflowName
    && item?.event === "push"
    && item?.head_branch === expectedBranch
  );

  if (!run) {
    const error = new Error(`Aucune exécution GitHub Actions réussie ne certifie la baseline ${sha || "(inconnue)"}.`);
    error.code = "MSE_25_30_PREFLIGHT_BASELINE_CI_NOT_ATTESTED";
    error.details = {
      validatedBaseSha: sha || null,
      expectedBranch,
      workflowName,
      candidateRuns: runs.map((item) => ({
        id: item?.id ?? null,
        name: item?.name ?? null,
        headSha: item?.head_sha ?? null,
        headBranch: item?.head_branch ?? null,
        event: item?.event ?? null,
        status: item?.status ?? null,
        conclusion: item?.conclusion ?? null,
      })),
    };
    throw error;
  }

  return {
    ok: true,
    repository: GITHUB_REPOSITORY,
    workflowId: GITHUB_WORKFLOW_ID,
    workflowName: run.name,
    runId: run.id,
    headSha: String(run.head_sha).toLowerCase(),
    headBranch: run.head_branch,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url || null,
    createdAt: run.created_at || null,
    updatedAt: run.updated_at || null,
  };
}

async function attestValidatedBaseline(validatedBaseSha, {
  request = jsonRequest,
  githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "",
  githubApiOrigin,
  expectedBranch = EXPECTED_BRANCH,
} = {}) {
  const url = baselineWorkflowRunsUrl(validatedBaseSha, { githubApiOrigin });
  let payload;
  try {
    payload = await request(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "mondescale-mse-25-30-preflight",
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (cause) {
    const error = new Error("Impossible de vérifier auprès de GitHub Actions que la baseline MSE-25.30 a été validée par la CI.");
    error.code = "MSE_25_30_PREFLIGHT_BASELINE_CI_ATTESTATION_UNAVAILABLE";
    error.details = {
      validatedBaseSha: String(validatedBaseSha || "").trim().toLowerCase() || null,
      cause: cause?.message || String(cause),
      causeCode: cause?.code || null,
    };
    throw error;
  }
  return selectSuccessfulBaselineRun(payload, validatedBaseSha, { expectedBranch });
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
  const resolvedExpectedBranch = expectedBranch || process.env.MSE_25_30_EXPECTED_BRANCH || EXPECTED_BRANCH;
  assertRepositoryState(repo, { expectedBranch: resolvedExpectedBranch, allowDirty });
  const validatedBaselineAttestation = await attestValidatedBaseline(repo.validatedBaseSha, {
    expectedBranch: resolvedExpectedBranch,
  });
  repo.validatedBaselineAttestation = validatedBaselineAttestation;

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
  COMMIT_SHA_PATTERN,
  DEFAULT_GITHUB_API_ORIGIN,
  DEFAULT_REPORT_DIR,
  DEFAULT_VALIDATED_BASE_SHA,
  EXPECTED_BRANCH,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  REQUIRED_HEALTH_FLAGS,
  RUNTIME_PROTECTED_PATHS,
  assertHealth,
  assertRepositoryState,
  attestValidatedBaseline,
  baselineWorkflowRunsUrl,
  gitSucceeds,
  jsonRequest,
  normalizeGithubApiOrigin,
  normalizeOrigin,
  protectedChangesSince,
  repositoryState,
  reportPath,
  selectSuccessfulBaselineRun,
  run,
};
