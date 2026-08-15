"use strict";

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:4000";
const REQUIRED_CONFIRMATION = "YES";

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

function summarize(payload = {}) {
  return {
    ok: payload?.writes === true,
    operation: payload?.operation || null,
    writes: payload?.writes === true,
    versioned: payload?.versioned === true,
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
    agencies: (payload?.agencies || []).map((agency) => ({
      agencyId: agency.agencyId,
      siteSlug: agency.siteSlug,
      pagesWritten: (agency.pages || []).filter((page) => page.changed).length,
      pages: (agency.pages || []).map((page) => ({
        slug: page.slug,
        changed: page.changed === true,
        version: page.version || null,
      })),
    })),
  };
}

async function run({ backendOrigin, tenantSlug, confirmation, createdBy, similarityThreshold, minimumWords, qualityMinimumWords } = {}) {
  requireConfirmation(confirmation || process.env.CONFIRM_MSE_25_30_ROLLOUT);

  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const tenant = String(tenantSlug || process.env.TENANT_SLUG || "mondescale").trim();
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

  const result = summarize(payload);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
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

module.exports = { run, jsonRequest, normalizeOrigin, requireConfirmation, summarize };
