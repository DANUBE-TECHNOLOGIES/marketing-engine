"use strict";

const legacy = require("../../../scripts/mse-25-30-post-rollout-validate");

function isPageLevelChange(change = {}) {
  return legacy.blockType({ blockType: change?.blockType }) === "page";
}

function pageFieldValue(page = {}, field) {
  const nested = page?.page && typeof page.page === "object" ? page.page : {};
  if (field === "seoTitle") return page?.seoTitle ?? nested?.seoTitle;
  if (field === "metaDescription") {
    return page?.metaDescription
      ?? page?.seoDescription
      ?? nested?.metaDescription
      ?? nested?.seoDescription;
  }
  const direct = legacy.valueAtPath(page, field);
  return direct !== undefined ? direct : legacy.valueAtPath(nested, field);
}

function validateExpectedChange(page, expectedChange = {}) {
  if (!isPageLevelChange(expectedChange)) {
    return legacy.validateExpectedChange(page, expectedChange);
  }

  const actual = pageFieldValue(page, expectedChange?.field);
  const ok = legacy.deepEqual(actual, expectedChange?.next);
  return {
    ok,
    reason: ok ? null : "page-value-mismatch",
    expected: expectedChange,
    actual: actual ?? null,
  };
}

async function validateSite({ origin, tenant, agency, sitemapExcluded = [], publicOrigin = "" }) {
  const siteSlug = String(agency?.siteSlug || "").trim();
  if (!siteSlug) {
    return { siteSlug: null, ok: false, errors: [{ code: "SITE_SLUG_MISSING" }], pages: [] };
  }

  const headers = { "x-tenant-slug": tenant };
  const publicResult = await legacy.readOnlyRequest(
    `${origin}/api/public-site-read/sites/${encodeURIComponent(siteSlug)}`,
    { headers }
  );
  const indexationResult = await legacy.readOnlyRequest(
    `${origin}/minisite-structured-data/sites/${encodeURIComponent(siteSlug)}/indexation`,
    { headers }
  );
  const contract = publicResult.payload || {};
  const indexation = indexationResult.payload || {};
  const pageResults = [];

  for (const rolloutPage of agency?.pages || []) {
    if (rolloutPage?.changed !== true) continue;

    const expectedPath = legacy.canonicalPagePath(siteSlug, rolloutPage.slug);
    const expectedChanges = Array.isArray(rolloutPage.expectedChanges) ? rolloutPage.expectedChanges : [];
    const expectedChangesPresent = expectedChanges.length > 0;
    const persistedResult = await legacy.readOnlyRequest(
      `${origin}/agencies/${encodeURIComponent(agency.agencyId)}/site/pages/${encodeURIComponent(legacy.pageBuilderSlug(rolloutPage.slug))}/blocks`,
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

    const page = legacy.findPage(contract, rolloutPage.slug);
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

    const sitemapEntry = legacy.sitemapEntryForPath(indexation.entries, expectedPath);
    const exclusion = legacy.exclusionForPage(sitemapExcluded, siteSlug, rolloutPage.slug);
    let mode = "invalid-sitemap-state";
    if (sitemapEntry) mode = "indexable";
    else if (exclusion?.reason === "noindex-page") mode = "noindex";
    else if (exclusion?.reason === "page-not-published") mode = "unpublished";

    let canonicalUrl = sitemapEntry?.url || null;
    let htmlProof = { ok: true, skipped: true, reason: "not-required" };
    let publicStateOk = false;

    if (mode === "indexable") {
      canonicalUrl = String(sitemapEntry.url);
      htmlProof = await legacy.htmlProofFor({
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
      canonicalUrl = legacy.absolutePublicUrl(publicOrigin, expectedPath);
      htmlProof = await legacy.htmlProofFor({
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
      slug: legacy.normalizeSlug(rolloutPage.slug),
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
  const loaded = legacy.loadRolloutReport(rolloutReport);
  const context = legacy.assertContext(loaded.report, {
    origin: backendOrigin || process.env.BACKEND_ORIGIN,
    tenant: tenantSlug || process.env.TENANT_SLUG,
  });
  const headers = { "x-tenant-slug": context.tenant };
  const sitemapResult = await legacy.readOnlyRequest(`${context.origin}/minisite-structured-data/sitemap`, { headers });
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

  const file = legacy.writePostRolloutReport(result, output);
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
  isPageLevelChange,
  pageFieldValue,
  run,
  validateExpectedChange,
  validateSite,
};
