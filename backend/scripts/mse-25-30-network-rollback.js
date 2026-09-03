"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:4000";
const REQUIRED_CONFIRMATION = "YES";
const ROLLOUT_REPORT_TYPE = "mse-25.30-network-rollout-report";

function normalizeOrigin(value) {
  return String(value || DEFAULT_BACKEND_ORIGIN).trim().replace(/\/+$/g, "");
}

function requireConfirmation(value) {
  if (String(value || "").trim().toUpperCase() !== REQUIRED_CONFIRMATION) {
    const error = new Error("Le rollback réseau MSE-25.30 exige CONFIRM_MSE_25_30_ROLLBACK=YES.");
    error.code = "MSE_25_30_NETWORK_ROLLBACK_OPERATOR_CONFIRMATION_REQUIRED";
    throw error;
  }
}

function normalizeManifest(manifest) {
  if (!Array.isArray(manifest) || manifest.length === 0) {
    const error = new Error("Le manifeste de rollback est vide ou invalide.");
    error.code = "MSE_25_30_NETWORK_ROLLBACK_MANIFEST_INVALID";
    throw error;
  }
  return manifest.map((item) => {
    const agencyId = item?.agencyId;
    const slug = String(item?.slug ?? "").trim();
    const rollbackVersionId = item?.rollbackVersionId;
    if (!agencyId || !rollbackVersionId) {
      const error = new Error("Chaque entrée doit fournir agencyId et rollbackVersionId.");
      error.code = "MSE_25_30_NETWORK_ROLLBACK_MANIFEST_INVALID";
      error.details = item;
      throw error;
    }
    return { agencyId, siteSlug: item.siteSlug || null, slug, rollbackVersionId };
  });
}

function loadManifest(filePath) {
  const configuredPath = String(filePath || process.env.MSE_25_30_ROLLBACK_MANIFEST || "").trim();
  if (!configuredPath) {
    const error = new Error("MSE_25_30_ROLLBACK_MANIFEST est obligatoire et doit pointer vers le rapport de rollout.");
    error.code = "MSE_25_30_NETWORK_ROLLBACK_MANIFEST_REQUIRED";
    throw error;
  }

  const resolvedPath = path.resolve(configuredPath);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (cause) {
    const error = new Error(`Impossible de lire le rapport de rollout : ${resolvedPath}`);
    error.code = "MSE_25_30_NETWORK_ROLLBACK_MANIFEST_INVALID";
    error.details = { reportPath: resolvedPath, cause: cause?.message || String(cause) };
    throw error;
  }

  const legacyAllowed = String(process.env.MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST || "").trim().toUpperCase() === "YES";
  if (Array.isArray(parsed) || parsed?.type !== ROLLOUT_REPORT_TYPE) {
    if (!legacyAllowed) {
      const error = new Error("Le rollback exige le rapport de rollout contextuel MSE-25.30. Un manifeste legacy nécessite MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST=YES.");
      error.code = "MSE_25_30_NETWORK_ROLLBACK_CONTEXT_REQUIRED";
      throw error;
    }
    const legacyManifest = Array.isArray(parsed) ? parsed : parsed?.rollbackManifest;
    return { manifest: normalizeManifest(legacyManifest), context: null, reportPath: resolvedPath, legacy: true };
  }

  return {
    manifest: normalizeManifest(parsed.rollbackManifest || parsed?.result?.rollbackManifest),
    context: {
      type: parsed.type,
      generatedAt: parsed.generatedAt || null,
      repository: parsed.repository || null,
      backend: parsed.backend || null,
      preflight: parsed.preflight || null,
    },
    reportPath: resolvedPath,
    legacy: false,
  };
}

function assertRollbackContext(context, { origin, tenant } = {}) {
  if (!context || context.type !== ROLLOUT_REPORT_TYPE) {
    const error = new Error("Contexte de rollout MSE-25.30 absent ou invalide.");
    error.code = "MSE_25_30_NETWORK_ROLLBACK_CONTEXT_REQUIRED";
    throw error;
  }
  if (normalizeOrigin(context?.backend?.origin) !== normalizeOrigin(origin)) {
    const error = new Error("Le backend de rollback ne correspond pas au backend du rollout.");
    error.code = "MSE_25_30_NETWORK_ROLLBACK_BACKEND_MISMATCH";
    error.details = { expected: context?.backend?.origin || null, actual: origin };
    throw error;
  }
  if (String(context?.backend?.tenant || "").trim() !== String(tenant || "").trim()) {
    const error = new Error("Le tenant de rollback ne correspond pas au tenant du rollout.");
    error.code = "MSE_25_30_NETWORK_ROLLBACK_TENANT_MISMATCH";
    error.details = { expected: context?.backend?.tenant || null, actual: tenant };
    throw error;
  }
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
    error.code = payload?.error || "MSE_25_30_NETWORK_ROLLBACK_HTTP_ERROR";
    error.statusCode = response.status;
    error.details = payload?.details || payload || {};
    throw error;
  }
  return payload;
}

async function run({ backendOrigin, tenantSlug, confirmation, manifestPath, createdBy } = {}) {
  requireConfirmation(confirmation || process.env.CONFIRM_MSE_25_30_ROLLBACK);
  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const tenant = String(tenantSlug || process.env.TENANT_SLUG || "mondescale").trim();
  const loaded = loadManifest(manifestPath);
  if (!loaded.legacy) assertRollbackContext(loaded.context, { origin, tenant });

  const manifest = [...loaded.manifest].reverse();
  const results = [];

  for (const item of manifest) {
    const encodedSlug = encodeURIComponent(item.slug || "home");
    const url = `${origin}/agencies/${encodeURIComponent(item.agencyId)}/site/pages/${encodedSlug}/versions/${encodeURIComponent(item.rollbackVersionId)}/rollback`;
    try {
      const payload = await jsonRequest(url, {
        method: "POST",
        headers: { "x-tenant-slug": tenant },
        body: JSON.stringify({
          createdBy: createdBy || process.env.CREATED_BY || "mse-25.30-network-rollback",
          reason: "mse-25.30-network-rollback",
        }),
      });
      results.push({
        agencyId: item.agencyId,
        siteSlug: item.siteSlug,
        slug: item.slug,
        rollbackVersionId: item.rollbackVersionId,
        ok: true,
        restoredVersion: payload?.version || null,
      });
    } catch (error) {
      results.push({
        agencyId: item.agencyId,
        siteSlug: item.siteSlug,
        slug: item.slug,
        rollbackVersionId: item.rollbackVersionId,
        ok: false,
        error: error.code || "ROLLBACK_FAILED",
        message: error.message,
      });
      break;
    }
  }

  const result = {
    ok: results.length === manifest.length && results.every((item) => item.ok),
    rolloutReportPath: loaded.reportPath,
    legacyManifest: loaded.legacy,
    requested: manifest.length,
    restored: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    stoppedEarly: results.length < manifest.length,
    results,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_30_NETWORK_ROLLBACK_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  ROLLOUT_REPORT_TYPE,
  assertRollbackContext,
  jsonRequest,
  loadManifest,
  normalizeManifest,
  normalizeOrigin,
  requireConfirmation,
  run,
};
