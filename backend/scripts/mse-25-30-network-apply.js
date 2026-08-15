"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  EXPECTED_BRANCH,
  assertRepositoryState,
  repositoryState,
} = require("./mse-25-30-preflight");

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:4000";
const REQUIRED_CONFIRMATION = "YES";
const DEFAULT_MAX_PREFLIGHT_AGE_MS = 30 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_REPORT_DIR = path.join(os.homedir(), "mse-25-30-reports");

function normalizeOrigin(value) {
  return String(value || DEFAULT_BACKEND_ORIGIN).trim().replace(/\/+$/g, "");
}

function requireConfirmation(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized !== REQUIRED_CONFIRMATION) {
    const error = new Error("Le rollout réseau MSE-25.30 exige CONFIRM_MSE_25_30_ROLLOUT=YES.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_OPERATOR_CONFIRMATION_REQUIRED";
    throw error;
  }
}

function loadPreflightReport(filePath) {
  const configuredPath = String(filePath || process.env.MSE_25_30_PREFLIGHT_REPORT || "").trim();
  if (!configuredPath) {
    const error = new Error("Le rollout réseau exige MSE_25_30_PREFLIGHT_REPORT vers un rapport de preflight validé.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_REPORT_REQUIRED";
    throw error;
  }

  const resolvedPath = path.resolve(configuredPath);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (cause) {
    const error = new Error(`Impossible de lire le rapport de preflight : ${resolvedPath}`);
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_REPORT_INVALID";
    error.details = { reportPath: resolvedPath, cause: cause?.message || String(cause) };
    throw error;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    const error = new Error("Le rapport de preflight MSE-25.30 est invalide.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_REPORT_INVALID";
    error.details = { reportPath: resolvedPath };
    throw error;
  }

  return { report: parsed, reportPath: resolvedPath };
}

function assertPreflightReport(report, {
  origin,
  tenant,
  repository,
  now = Date.now(),
  maxAgeMs = Number(process.env.MSE_25_30_PREFLIGHT_MAX_AGE_MS || DEFAULT_MAX_PREFLIGHT_AGE_MS),
} = {}) {
  const generatedAtMs = Date.parse(report?.generatedAt || "");
  const effectiveMaxAgeMs = Number(maxAgeMs);
  if (!Number.isFinite(generatedAtMs)) {
    const error = new Error("Le rapport de preflight ne contient pas de date generatedAt valide.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_TIMESTAMP_INVALID";
    throw error;
  }
  if (!Number.isFinite(effectiveMaxAgeMs) || effectiveMaxAgeMs <= 0) {
    const error = new Error("La durée maximale du preflight est invalide.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_MAX_AGE_INVALID";
    throw error;
  }

  const ageMs = Number(now) - generatedAtMs;
  if (ageMs < -MAX_CLOCK_SKEW_MS) {
    const error = new Error("Le rapport de preflight semble provenir du futur ; vérifiez l'horloge de la VM.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_CLOCK_SKEW";
    error.details = { generatedAt: report.generatedAt, ageMs };
    throw error;
  }
  if (ageMs > effectiveMaxAgeMs) {
    const error = new Error("Le rapport de preflight est trop ancien. Relancez npm run mse-25.30:preflight avant le rollout.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_EXPIRED";
    error.details = { generatedAt: report.generatedAt, ageMs, maxAgeMs: effectiveMaxAgeMs };
    throw error;
  }

  if (report?.preview?.ok !== true || report?.preview?.rolloutBlocked === true || report?.preview?.summary?.rolloutBlocked === true) {
    const error = new Error("Le rapport de preflight n'autorise pas le rollout réseau.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_BLOCKED";
    error.details = {
      previewOk: report?.preview?.ok,
      rolloutBlocked: report?.preview?.rolloutBlocked ?? report?.preview?.summary?.rolloutBlocked,
    };
    throw error;
  }

  if (normalizeOrigin(report?.backend?.origin) !== normalizeOrigin(origin)) {
    const error = new Error("Le backend ciblé ne correspond pas au backend validé par le preflight.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_BACKEND_MISMATCH";
    error.details = { expected: report?.backend?.origin || null, actual: origin };
    throw error;
  }
  if (String(report?.backend?.tenant || "").trim() !== String(tenant || "").trim()) {
    const error = new Error("Le tenant ciblé ne correspond pas au tenant validé par le preflight.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_TENANT_MISMATCH";
    error.details = { expected: report?.backend?.tenant || null, actual: tenant };
    throw error;
  }
  if (!report?.repository?.head || report.repository.head !== repository?.head) {
    const error = new Error("Le HEAD Git courant ne correspond pas à celui du preflight. Relancez le preflight.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_HEAD_MISMATCH";
    error.details = { expected: report?.repository?.head || null, actual: repository?.head || null };
    throw error;
  }

  return { ageMs, maxAgeMs: effectiveMaxAgeMs };
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let payload = null;
  try { payload = await response.json(); } catch (_error) { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.code = payload?.error || "MSE_25_30_NETWORK_ROLLOUT_HTTP_ERROR";
    error.statusCode = response.status;
    error.details = payload?.details || payload || {};
    throw error;
  }
  return payload;
}

function normalizeExpectedChanges(changes = []) {
  return (Array.isArray(changes) ? changes : []).map((change) => ({
    blockId: change?.blockId ?? null,
    blockType: change?.blockType || null,
    field: change?.field || null,
    previous: change?.previous ?? null,
    next: change?.next ?? null,
  }));
}

function normalizeExcludedPages(pages = []) {
  return (Array.isArray(pages) ? pages : []).map((page) => ({
    slug: page?.slug ?? null,
    title: page?.title ?? null,
    reason: page?.reason ?? null,
  }));
}

function summarize(payload = {}) {
  const agencies = (payload?.agencies || []).map((agency) => ({
    agencyId: agency.agencyId,
    siteSlug: agency.siteSlug,
    pagesWritten: (agency.pages || []).filter((page) => page.changed).length,
    excludedPages: normalizeExcludedPages(agency.excludedPages),
    pages: (agency.pages || []).map((page) => ({
      slug: page.slug,
      changed: page.changed === true,
      version: page.version || null,
      rollbackVersion: page.rollbackVersion || null,
      rollbackVersionId: page.rollbackVersionId || null,
      expectedChanges: normalizeExpectedChanges(page.changes),
    })),
  }));

  return {
    ok: payload?.writes === true,
    operation: payload?.operation || null,
    writes: payload?.writes === true,
    versioned: payload?.versioned === true,
    rollbackReady: payload?.rollbackReady === true,
    automaticallyCompensatedOnFailure: payload?.automaticallyCompensatedOnFailure === true,
    summary: payload?.summary || {},
    similarity: {
      threshold: payload?.similarity?.threshold ?? null,
      conflictCount: payload?.similarity?.conflictCount ?? 0,
    },
    quality: {
      blockingCount: payload?.quality?.blockingCount ?? 0,
      warningCount: payload?.quality?.warningCount ?? 0,
    },
    sitemapReadiness: payload?.sitemapReadiness || null,
    rollbackManifest: agencies.flatMap((agency) =>
      agency.pages
        .filter((page) => page.changed && page.rollbackVersionId)
        .map((page) => ({
          agencyId: agency.agencyId,
          siteSlug: agency.siteSlug,
          slug: page.slug,
          appliedVersion: page.version,
          rollbackVersion: page.rollbackVersion,
          rollbackVersionId: page.rollbackVersionId,
        }))
    ),
    agencies,
  };
}

function rolloutReportPath(value) {
  if (value) return path.resolve(value);
  const directory = path.resolve(process.env.MSE_25_30_REPORT_DIR || DEFAULT_REPORT_DIR);
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(directory, `mse-25-30-network-rollout-${stamp}.json`);
}

function writeRolloutReport({ output, repository, origin, tenant, preflight, result } = {}) {
  const file = rolloutReportPath(output || process.env.MSE_25_30_ROLLOUT_OUTPUT);
  const report = {
    type: "mse-25.30-network-rollout-report",
    generatedAt: new Date().toISOString(),
    repository,
    backend: { origin, tenant },
    preflight,
    result,
    rollbackManifest: result?.rollbackManifest || [],
  };
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + "\n", "utf8");
  return { file, report };
}

function tryWriteRolloutReport(args = {}, writer = writeRolloutReport) {
  try {
    const written = writer(args);
    return {
      persisted: true,
      file: written?.file || null,
      error: null,
    };
  } catch (cause) {
    return {
      persisted: false,
      file: null,
      error: {
        code: "MSE_25_30_ROLLOUT_REPORT_WRITE_FAILED",
        message: cause?.message || String(cause),
      },
    };
  }
}

async function run({ backendOrigin, tenantSlug, confirmation, createdBy, similarityThreshold, minimumWords, qualityMinimumWords, preflightReport, maxPreflightAgeMs, output } = {}) {
  requireConfirmation(confirmation || process.env.CONFIRM_MSE_25_30_ROLLOUT);

  const repo = repositoryState();
  assertRepositoryState(repo, {
    expectedBranch: process.env.MSE_25_30_EXPECTED_BRANCH || EXPECTED_BRANCH,
    allowDirty: false,
  });

  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const tenant = String(tenantSlug || process.env.TENANT_SLUG || "mondescale").trim();
  const loadedPreflight = loadPreflightReport(preflightReport);
  const preflightValidation = assertPreflightReport(loadedPreflight.report, {
    origin,
    tenant,
    repository: repo,
    maxAgeMs: maxPreflightAgeMs,
  });

  const body = {
    dryRun: false,
    confirm: true,
    createdBy: createdBy || process.env.CREATED_BY || "mse-25.30-network-operator",
  };

  if (similarityThreshold !== undefined || process.env.SIMILARITY_THRESHOLD) {
    body.similarityThreshold = Number(similarityThreshold ?? process.env.SIMILARITY_THRESHOLD);
  }
  if (minimumWords !== undefined || process.env.MINIMUM_WORDS) {
    body.minimumWords = Number(minimumWords ?? process.env.MINIMUM_WORDS);
  }
  if (qualityMinimumWords !== undefined || process.env.QUALITY_MINIMUM_WORDS) {
    body.qualityMinimumWords = Number(qualityMinimumWords ?? process.env.QUALITY_MINIMUM_WORDS);
  }

  const payload = await jsonRequest(`${origin}/minisite-seo-enrichment/network/content-optimize`, {
    method: "POST",
    headers: { "x-tenant-slug": tenant },
    body: JSON.stringify(body),
  });

  const result = {
    ...summarize(payload),
    preflight: {
      reportPath: loadedPreflight.reportPath,
      generatedAt: loadedPreflight.report.generatedAt,
      ageMs: preflightValidation.ageMs,
      repositoryHead: repo.head,
    },
  };

  const reportWrite = tryWriteRolloutReport({
    output,
    repository: repo,
    origin,
    tenant,
    preflight: result.preflight,
    result,
  });
  result.rolloutReportPersisted = reportWrite.persisted;
  result.rolloutReportPath = reportWrite.file;
  result.operatorAttentionRequired = reportWrite.persisted !== true;
  if (reportWrite.error) result.rolloutReportError = reportWrite.error;

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok || !result.rolloutReportPersisted) process.exitCode = 2;
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_30_NETWORK_ROLLOUT_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_MAX_PREFLIGHT_AGE_MS,
  DEFAULT_REPORT_DIR,
  MAX_CLOCK_SKEW_MS,
  assertPreflightReport,
  jsonRequest,
  loadPreflightReport,
  normalizeExcludedPages,
  normalizeExpectedChanges,
  normalizeOrigin,
  requireConfirmation,
  rolloutReportPath,
  run,
  summarize,
  tryWriteRolloutReport,
  writeRolloutReport,
};
