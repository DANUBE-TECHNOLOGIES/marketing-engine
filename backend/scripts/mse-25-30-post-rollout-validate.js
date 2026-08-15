"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { validatePublicHtml } = require("./mse-25-30-public-html-check");

const DEFAULT_REPORT_DIR = path.join(os.homedir(), "mse-25-30-reports");
const ROLLOUT_REPORT_TYPE = "mse-25.30-network-rollout-report";

function normalizeOrigin(value) {
  return String(value || "http://127.0.0.1:4000").trim().replace(/\/+$/g, "");
}

function normalizeSlug(value) {
  const slug = String(value ?? "").trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return ["home", "accueil", "index"].includes(slug) ? "" : slug;
}

function pageBuilderSlug(value) {
  return normalizeSlug(value) || "home";
}

function loadRolloutReport(filePath) {
  const configuredPath = String(filePath || process.env.MSE_25_30_ROLLOUT_REPORT || "").trim();
  if (!configuredPath) {
    const error = new Error("MSE_25_30_ROLLOUT_REPORT est obligatoire pour la validation post-rollout.");
    error.code = "MSE_25_30_POST_ROLLOUT_REPORT_REQUIRED";
    throw error;
  }

  const resolvedPath = path.resolve(configuredPath);
  let report;
  try {
    report = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (cause) {
    const error = new Error(`Impossible de lire le rapport de rollout : ${resolvedPath}`);
    error.code = "MSE_25_30_POST_ROLLOUT_REPORT_INVALID";
    error.details = { reportPath: resolvedPath, cause: cause?.message || String(cause) };
    throw error;
  }

  if (report?.type !== ROLLOUT_REPORT_TYPE || report?.result?.ok !== true || report?.result?.writes !== true) {
    const error = new Error("Le rapport fourni ne décrit pas un rollout MSE-25.30 appliqué avec succès.");
    error.code = "MSE_25_30_POST_ROLLOUT_REPORT_NOT_APPLIED";
    error.details = { type: report?.type || null, ok: report?.result?.ok, writes: report?.result?.writes };
    throw error;
  }

  return { report, reportPath: resolvedPath };
}

function assertContext(report, { origin, tenant } = {}) {
  const expectedOrigin = normalizeOrigin(report?.backend?.origin);
  const expectedTenant = String(report?.backend?.tenant || "").trim();
  const actualOrigin = normalizeOrigin(origin || expectedOrigin);
  const actualTenant = String(tenant || expectedTenant).trim();

  if (!expectedOrigin || actualOrigin !== expectedOrigin) {
    const error = new Error("Le backend de validation ne correspond pas au backend du rollout.");
    error.code = "MSE_25_30_POST_ROLLOUT_BACKEND_MISMATCH";
    error.details = { expected: expectedOrigin || null, actual: actualOrigin || null };
    throw error;
  }
  if (!expectedTenant || actualTenant !== expectedTenant) {
    const error = new Error("Le tenant de validation ne correspond pas au tenant du rollout.");
    error.code = "MSE_25_30_POST_ROLLOUT_TENANT_MISMATCH";
    error.details = { expected: expectedTenant || null, actual: actualTenant || null };
    throw error;
  }

  return { origin: actualOrigin, tenant: actualTenant };
}

async function readOnlyRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  if (method !== "GET") {
    const error = new Error(`La validation post-rollout est strictement read-only : méthode ${method} refusée.`);
    error.code = "MSE_25_30_POST_ROLLOUT_WRITE_METHOD_REFUSED";
    throw error;
  }

  const response = await fetch(url, {
    ...options,
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
  let payload;
  if (contentType.includes("json")) {
    try { payload = await response.json(); } catch (_error) { payload = null; }
  } else {
    try { payload = await response.text(); } catch (_error) { payload = ""; }
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.code = payload?.error || "MSE_25_30_POST_ROLLOUT_HTTP_ERROR";
    error.statusCode = response.status;
    error.details = payload?.details || payload || {};
    throw error;
  }

  return { payload, contentType, status: response.status };
}

function blockType(block = {}) {
  return String(block.blockType || block.type || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function valueAtPath(source, field) {
  if (!field) return undefined;
  return String(field).split(".").reduce((value, token) => {
    if (value === null || value === undefined) return undefined;
    const key = /^\d+$/.test(token) ? Number(token) : token;
    return value[key];
  }, source);
}

function stableComparable(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(stableComparable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableComparable(value[key])]));
  }
  return value;
}

function deepEqual(left, right) {
  return JSON.stringify(stableComparable(left)) === JSON.stringify(stableComparable(right));
}

function containsExpected(actual, expected) {
  if (expected === null || typeof expected !== "object") return deepEqual(actual, expected);
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length < expected.length) return false;
    return expected.every((item, index) => containsExpected(actual[index], item));
  }
  if (!actual || typeof actual !== "object") return false;
  return Object.entries(expected).every(([key, value]) => containsExpected(actual[key], value));
}

function findPage(contract, slug) {
  const normalized = normalizeSlug(slug);
  return (contract?.pages || []).find((page) => normalizeSlug(page?.slug) === normalized) || null;
}

function candidateBlocks(page, expectedChange) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  if (expectedChange?.blockId !== null && expectedChange?.blockId !== undefined) {
    const byId = blocks.find((block) => String(block?.id) === String(expectedChange.blockId));
    return byId ? [byId] : [];
  }
  const expectedType = blockType({ blockType: expectedChange?.blockType });
  return expectedType ? blocks.filter((block) => blockType(block) === expectedType) : blocks;
}

function validateExpectedChange(page, expectedChange) {
  const blocks = candidateBlocks(page, expectedChange);
  if (!blocks.length) {
    return { ok: false, reason: "block-not-found", expected: expectedChange, actual: null };
  }

  if (expectedChange?.field === "block") {
    const matched = blocks.find((block) => containsExpected(block?.content || {}, expectedChange.next));
    return {
      ok: Boolean(matched),
      reason: matched ? null : "generated-block-content-mismatch",
      expected: expectedChange,
      actual: matched?.content || blocks.map((block) => block?.content || {}),
    };
  }

  for (const block of blocks) {
    const actual = valueAtPath(block?.content || {}, expectedChange?.field);
    if (deepEqual(actual, expectedChange?.next)) {
      return { ok: true, reason: null, expected: expectedChange, actual };
    }
  }

  const actual = blocks.length === 1
    ? valueAtPath(blocks[0]?.content || {}, expectedChange?.field)
    : blocks.map((block) => valueAtPath(block?.content || {}, expectedChange?.field));
  return { ok: false, reason: "value-mismatch", expected: expectedChange, actual };
}

function canonicalPagePath(siteSlug, pageSlug) {
  const site = String(siteSlug || "").trim().replace(/^\/+|\/+$/g, "");
  const slug = normalizeSlug(pageSlug);
  return slug ? `/agence/${site}/${slug}` : `/agence/${site}`;
}

function entryMatchesPath(entry, expectedPath) {
  const raw = String(entry?.url || "").trim();
  if (!raw) return false;
  try {
    const url = new URL(raw, "https://validation.invalid");
    return url.pathname.replace(/\/+$/g, "") === expectedPath.replace(/\/+$/g, "");
  } catch (_error) {
    return raw.replace(/\/+$/g, "").endsWith(expectedPath.replace(/\/+$/g, ""));
  }
}

function sitemapEntryForPath(entries, expectedPath) {
  return (entries || []).find((entry) => entryMatchesPath(entry, expectedPath)) || null;
}

function exclusionForPage(excluded = [], siteSlug, pageSlug) {
  const site = String(siteSlug || "").trim();
  const rawSlug = String(pageSlug || "").trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return (excluded || []).find((item) =>
    item?.type === "page"
    && String(item?.siteSlug || "").trim() === site
    && String(item?.pageSlug || "").trim().replace(/^\/+|\/+$/g, "").toLowerCase() === rawSlug
  ) || null;
}

function absolutePublicUrl(publicOrigin, expectedPath) {
  const origin = String(publicOrigin || "").trim().replace(/\/+$/g, "");
  return origin ? `${origin}${expectedPath}` : null;
}

function postRolloutReportPath(value) {
  if (value) return path.resolve(value);
  const directory = path.resolve(process.env.MSE_25_30_REPORT_DIR || DEFAULT_REPORT_DIR);
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(directory, `mse-25-30-post-rollout-${stamp}.json`);
}

function writePostRolloutReport(result, output) {
  const file = postRolloutReportPath(output || process.env.MSE_25_30_POST_ROLLOUT_OUTPUT);
  fs.writeFileSync(file, JSON.stringify(result, null, 2) + "\n", "utf8");
  return file;
}

async function htmlProofFor({ canonicalUrl, expectedChanges, expectedIndexable, verifyExpectedHero = true }) {
  if (!canonicalUrl) return { ok: false, skipped: true, reason: "canonical-url-missing" };
  try {
    const htmlResult = await readOnlyRequest(canonicalUrl, { headers: { Accept: "text/html" } });
    return {
      ...validatePublicHtml({
        html: htmlResult.payload,
        canonicalUrl,
        expectedChanges,
        expectedIndexable,
        verifyExpectedHero,
      }),
      skipped: false,
      status: htmlResult.status,
      contentType: htmlResult.contentType,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error.code || "PUBLIC_HTML_FETCH_FAILED",
      message: error.message,
      status: error.statusCode || null,
    };
  }
}

async function validateSite({ origin, tenant, agency, sitemapExcluded = [], publicOrigin = "" }) {
  const siteSlug = String(agency?.siteSlug || "").trim();
  if (!siteSlug) {
    return { siteSlug: null, ok: false, errors: [{ code: "SITE_SLUG_MISSING" }], pages: [] };
  }

  const headers = { "x-tenant-slug": tenant };
  const publicResult = await readOnlyRequest(`${origin}/api/public-site-read/sites/${encodeURIComponent(siteSlug)}`, { headers });
  const indexationResult = await readOnlyRequest(`${origin}/minisite-structured-data/sites/${encodeURIComponent(siteSlug)}/indexation`, { headers });
  const contract = publicResult.payload || {};
  const indexation = indexationResult.payload || {};
  const pageResults = [];

  for (const rolloutPage of agency?.pages || []) {
    if (rolloutPage?.changed !== true) continue;

    const expectedPath = canonicalPagePath(siteSlug, rolloutPage.slug);
    const expectedChanges = Array.isArray(rolloutPage.expectedChanges) ? rolloutPage.expectedChanges : [];
    const expectedChangesPresent = expectedChanges.length > 0;
    const persistedResult = await readOnlyRequest(
      `${origin}/agencies/${encodeURIComponent(agency.agencyId)}/site/pages/${encodeURIComponent(pageBuilderSlug(rolloutPage.slug))}/blocks`,
      { headers }
    );
    const persistedPage = persistedResult.payload || {};
    const persistedChanges = expectedChanges.map((change) => validateExpectedChange(persistedPage, change));
    const persistedProof = {
      ok: expectedChangesPresent && persistedChanges.every((item) => item.ok),
      expectedChangeCount: persistedChanges.length,
      matchedChangeCount: persistedChanges.filter((item) => item.ok).length,
      published: persistedPage?.published === true,
      status: persistedPage?.status || null,
      changes: persistedChanges,
    };

    const page = findPage(contract, rolloutPage.slug);
    const publicChanges = expectedChanges.map((change) => page
      ? validateExpectedChange(page, change)
      : { ok: false, reason: "page-not-public", expected: change, actual: null });
    const publicProof = {
      present: Boolean(page),
      published: page?.published === true,
      contentSource: page?.contentSource || null,
      websiteDesignerV2: page?.contentSource === "website-designer-v2-blocks",
      matchedChangeCount: publicChanges.filter((item) => item.ok).length,
      changes: publicChanges,
    };

    const sitemapEntry = sitemapEntryForPath(indexation.entries, expectedPath);
    const exclusion = exclusionForPage(sitemapExcluded, siteSlug, rolloutPage.slug);
    let mode = "invalid-sitemap-state";
    if (sitemapEntry) mode = "indexable";
    else if (exclusion?.reason === "noindex-page") mode = "noindex";
    else if (exclusion?.reason === "page-not-published") mode = "unpublished";

    let canonicalUrl = sitemapEntry?.url || null;
    let htmlProof = { ok: true, skipped: true, reason: "not-required" };
    let publicStateOk = false;

    if (mode === "indexable") {
      canonicalUrl = String(sitemapEntry.url);
      htmlProof = await htmlProofFor({
        canonicalUrl,
        expectedChanges,
        expectedIndexable: true,
        verifyExpectedHero: true,
      });
      publicStateOk = publicProof.present
        && publicProof.published
        && publicProof.websiteDesignerV2
        && publicChanges.every((item) => item.ok)
        && htmlProof.ok === true;
    } else if (mode === "noindex") {
      canonicalUrl = absolutePublicUrl(publicOrigin, expectedPath);
      htmlProof = await htmlProofFor({
        canonicalUrl,
        expectedChanges,
        expectedIndexable: false,
        verifyExpectedHero: false,
      });
      publicStateOk = publicProof.present
        && publicProof.published
        && publicProof.websiteDesignerV2
        && publicChanges.every((item) => item.ok)
        && htmlProof.ok === true;
    } else if (mode === "unpublished") {
      const remainsDraft = persistedPage?.published !== true
        && String(persistedPage?.status || "").trim().toLowerCase() !== "published";
      publicStateOk = remainsDraft && !publicProof.present;
      htmlProof = { ok: true, skipped: true, reason: "page-not-published" };
    }

    pageResults.push({
      slug: normalizeSlug(rolloutPage.slug),
      rawSlug: String(rolloutPage.slug ?? ""),
      expectedPath,
      mode,
      exclusion: exclusion ? { reason: exclusion.reason, pageSlug: exclusion.pageSlug } : null,
      sitemapPresent: Boolean(sitemapEntry),
      canonicalUrl,
      expectedChangesPresent,
      persistedProof,
      publicProof,
      htmlProof,
      ok: persistedProof.ok && publicStateOk && mode !== "invalid-sitemap-state",
    });
  }

  const readinessOk = indexation.readyToSubmit === true;
  return {
    siteSlug,
    agencyId: agency?.agencyId ?? null,
    readyToSubmit: readinessOk,
    entryCount: Number(indexation.entryCount || 0),
    readiness: indexation.readiness || null,
    pages: pageResults,
    ok: readinessOk && pageResults.length > 0 && pageResults.every((page) => page.ok),
  };
}

async function run({ rolloutReport, backendOrigin, tenantSlug, output } = {}) {
  const loaded = loadRolloutReport(rolloutReport);
  const context = assertContext(loaded.report, {
    origin: backendOrigin || process.env.BACKEND_ORIGIN,
    tenant: tenantSlug || process.env.TENANT_SLUG,
  });
  const headers = { "x-tenant-slug": context.tenant };
  const sitemapResult = await readOnlyRequest(`${context.origin}/minisite-structured-data/sitemap`, { headers });
  const sitemap = sitemapResult.payload || {};

  const agencies = [];
  for (const agency of loaded.report?.result?.agencies || []) {
    agencies.push(await validateSite({
      ...context,
      agency,
      sitemapExcluded: sitemap.excluded || [],
      publicOrigin: sitemap.publicOrigin || "",
    }));
  }

  const pages = agencies.flatMap((item) => item.pages || []);
  const result = {
    type: "mse-25.30-post-rollout-validation",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    rolloutReportPath: loaded.reportPath,
    backend: context,
    publicOrigin: sitemap.publicOrigin || null,
    summary: {
      agenciesChecked: agencies.length,
      agenciesOk: agencies.filter((item) => item.ok).length,
      pagesChecked: pages.length,
      pagesOk: pages.filter((page) => page.ok).length,
      indexablePages: pages.filter((page) => page.mode === "indexable").length,
      noindexPages: pages.filter((page) => page.mode === "noindex").length,
      unpublishedPages: pages.filter((page) => page.mode === "unpublished").length,
      invalidSitemapStates: pages.filter((page) => page.mode === "invalid-sitemap-state").length,
      htmlPagesOk: pages.filter((page) => page.htmlProof?.skipped !== true && page.htmlProof?.ok === true).length,
      failedPersistedChanges: pages.reduce((sum, page) => sum + (page.persistedProof?.changes || []).filter((change) => !change.ok).length, 0),
      failedPublicChanges: pages.reduce((sum, page) => sum + (page.publicProof?.changes || []).filter((change) => !change.ok).length, 0),
      missingExpectedChangeSets: pages.filter((page) => page.expectedChangesPresent !== true).length,
      sitesNotReady: agencies.filter((item) => item.readyToSubmit !== true).length,
    },
    agencies,
  };
  result.ok = agencies.length > 0 && agencies.every((item) => item.ok);

  const file = writePostRolloutReport(result, output);
  result.reportPath = file;
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      readOnly: true,
      error: error.code || "MSE_25_30_POST_ROLLOUT_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_REPORT_DIR,
  ROLLOUT_REPORT_TYPE,
  absolutePublicUrl,
  assertContext,
  blockType,
  candidateBlocks,
  canonicalPagePath,
  containsExpected,
  deepEqual,
  entryMatchesPath,
  exclusionForPage,
  findPage,
  htmlProofFor,
  loadRolloutReport,
  normalizeOrigin,
  normalizeSlug,
  pageBuilderSlug,
  postRolloutReportPath,
  readOnlyRequest,
  run,
  sitemapEntryForPath,
  stableComparable,
  validateExpectedChange,
  validateSite,
  valueAtPath,
  writePostRolloutReport,
};
