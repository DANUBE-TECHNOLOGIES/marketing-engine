"use strict";

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:4000";

function normalizeOrigin(value) {
  return String(value || DEFAULT_BACKEND_ORIGIN).trim().replace(/\/+$/g, "");
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
    error.code = payload?.error || "MSE_25_30_NETWORK_PREVIEW_HTTP_ERROR";
    error.statusCode = response.status;
    error.details = payload?.details || payload || {};
    throw error;
  }
  return payload;
}

function agencySummary(plan = {}) {
  const pages = Array.isArray(plan.pages) ? plan.pages : [];
  return {
    agencyId: plan.agencyId,
    siteSlug: plan.siteSlug,
    city: plan.city || null,
    pagesProcessed: plan.summary?.pagesProcessed ?? pages.length,
    pagesChanged: plan.summary?.pagesChanged ?? pages.filter((page) => page.changed).length,
    targetCities: Array.isArray(plan.targetCities) ? plan.targetCities : [],
    changedPages: pages
      .filter((page) => page.changed)
      .map((page) => ({
        slug: page.slug,
        title: page.title,
        changeCount: Array.isArray(page.changes) ? page.changes.length : 0,
        changes: Array.isArray(page.changes)
          ? page.changes.map((change) => ({
              blockType: change.blockType || null,
              field: change.field || null,
              generated: change.generated === true,
            }))
          : [],
      })),
  };
}

async function run({
  backendOrigin,
  tenantSlug,
  similarityThreshold,
  minimumWords,
  qualityMinimumWords,
  emitOutput = true,
  setExitCode = true,
} = {}) {
  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const tenant = String(tenantSlug || process.env.TENANT_SLUG || "mondescale").trim();
  const body = {};
  if (similarityThreshold !== undefined || process.env.SIMILARITY_THRESHOLD) {
    body.similarityThreshold = Number(similarityThreshold ?? process.env.SIMILARITY_THRESHOLD);
  }
  if (minimumWords !== undefined || process.env.MINIMUM_WORDS) {
    body.minimumWords = Number(minimumWords ?? process.env.MINIMUM_WORDS);
  }
  if (qualityMinimumWords !== undefined || process.env.QUALITY_MINIMUM_WORDS) {
    body.qualityMinimumWords = Number(qualityMinimumWords ?? process.env.QUALITY_MINIMUM_WORDS);
  }

  const payload = await jsonRequest(`${origin}/minisite-seo-enrichment/network/content-optimize/preview`, {
    method: "POST",
    headers: { "x-tenant-slug": tenant },
    body: JSON.stringify(body),
  });

  const result = {
    ok: payload?.summary?.rolloutBlocked !== true,
    rolloutBlocked: payload?.summary?.rolloutBlocked === true,
    summary: payload?.summary || {},
    similarity: {
      threshold: payload?.similarity?.threshold ?? null,
      conflictCount: payload?.similarity?.conflictCount ?? 0,
      conflicts: payload?.similarity?.conflicts || [],
    },
    quality: {
      blockingCount: payload?.quality?.blockingCount ?? 0,
      warningCount: payload?.quality?.warningCount ?? 0,
      blocking: payload?.quality?.blocking || [],
      warnings: payload?.quality?.warnings || [],
    },
    sitemapReadiness: payload?.sitemapReadiness || null,
    agencies: (payload?.plans || []).map(agencySummary),
  };

  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  if (setExitCode && result.rolloutBlocked) process.exitCode = 2;
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_30_NETWORK_PREVIEW_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { run, jsonRequest, normalizeOrigin, agencySummary };
