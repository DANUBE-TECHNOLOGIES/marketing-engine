"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  COVERAGE_REASONS,
  IndexationCoverageService,
  diagnosticForPage,
  normalizedUrl,
  summarize,
} = require("../src/modules/search-console-submission/indexation-coverage");

const ORIGIN = "https://agences.mondescale.com";

function page(id, slug, extra = {}) {
  return { id, slug, status: "published", ...extra };
}

test("normalizedUrl removes query, fragment and trailing slash without changing root", () => {
  assert.equal(normalizedUrl("https://agences.mondescale.com/agence/gien/services/?utm=x#top"), "https://agences.mondescale.com/agence/gien/services");
  assert.equal(normalizedUrl("https://agences.mondescale.com/"), "https://agences.mondescale.com/");
});

test("local actionable causes take precedence over missing Search Console analytics", () => {
  const sitemapUrls = new Set(["https://agences.mondescale.com/agence/gien"]);
  const observedUrls = new Set();

  const missing = diagnosticForPage({ page: page("services", "services"), publicOrigin: ORIGIN, siteSlug: "gien", sitemapUrls, observedUrls, analyticsHasData: false });
  assert.equal(missing.reason, COVERAGE_REASONS.MISSING_FROM_SITEMAP);

  const noindex = diagnosticForPage({ page: page("privacy", "politique-de-confidentialite"), publicOrigin: ORIGIN, siteSlug: "gien", sitemapUrls, observedUrls, analyticsHasData: false });
  assert.equal(noindex.reason, COVERAGE_REASONS.NOT_INDEXABLE);

  const robots = diagnosticForPage({ page: page("blocked", "offres", { seo: { robots: "noindex,follow" } }), publicOrigin: ORIGIN, siteSlug: "gien", sitemapUrls: new Set(["https://agences.mondescale.com/agence/gien/offres"]), observedUrls, analyticsHasData: false });
  assert.equal(robots.reason, COVERAGE_REASONS.ROBOTS_BLOCKED);
});

test("clean sitemap page waits for Google without being declared non-indexed", () => {
  const url = "https://agences.mondescale.com/agence/gien/services";
  const item = diagnosticForPage({ page: page("services", "services"), publicOrigin: ORIGIN, siteSlug: "gien", sitemapUrls: new Set([url]), observedUrls: new Set(), analyticsHasData: false });
  assert.equal(item.reason, COVERAGE_REASONS.SITEMAP_EXPOSED_WAITING_FOR_GOOGLE);
  assert.equal(item.indexableByLocalContract, true);
  assert.equal(item.observedBySearchConsoleAnalytics, false);
});

test("Search Console page rows are observations, not an indexation verdict", () => {
  const url = "https://agences.mondescale.com/agence/gien/services";
  const observed = diagnosticForPage({ page: page("services", "services"), publicOrigin: ORIGIN, siteSlug: "gien", sitemapUrls: new Set([url]), observedUrls: new Set([url]), analyticsHasData: true });
  assert.equal(observed.reason, COVERAGE_REASONS.OBSERVED_BY_SEARCH_CONSOLE);

  const notObserved = diagnosticForPage({ page: page("contact", "contact"), publicOrigin: ORIGIN, siteSlug: "gien", sitemapUrls: new Set(["https://agences.mondescale.com/agence/gien/contact"]), observedUrls: new Set([url]), analyticsHasData: true });
  assert.equal(notObserved.reason, COVERAGE_REASONS.NOT_OBSERVED_BY_SEARCH_CONSOLE);
});

test("canonical mismatch is reported before generic Google waiting", () => {
  const url = "https://agences.mondescale.com/agence/gien/services";
  const item = diagnosticForPage({ page: page("services", "services", { canonicalUrl: "https://agences.mondescale.com/agence/gien/contact" }), publicOrigin: ORIGIN, siteSlug: "gien", sitemapUrls: new Set([url]), observedUrls: new Set(), analyticsHasData: false });
  assert.equal(item.reason, COVERAGE_REASONS.CANONICAL_MISMATCH);
  assert.equal(item.canonicalMatchesPublicUrl, false);
});

test("summary exposes local issues independently from Google data state", () => {
  const summary = summarize([
    { reason: COVERAGE_REASONS.MISSING_FROM_SITEMAP, inSitemap: false, indexableByLocalContract: true, observedBySearchConsoleAnalytics: false },
    { reason: COVERAGE_REASONS.SITEMAP_EXPOSED_WAITING_FOR_GOOGLE, inSitemap: true, indexableByLocalContract: true, observedBySearchConsoleAnalytics: false },
  ], false);
  assert.equal(summary.status, "LOCAL_INDEXATION_ISSUES_FOUND");
  assert.equal(summary.localIssueCount, 1);
  assert.equal(summary.missingFromSitemapCount, 1);
  assert.equal(summary.waitingForGoogleCount, 1);
});

test("service cross-checks published AgencySitePage rows, sitemap and Search Console analytics read-only", async () => {
  const site = { id: "site-1", slug: "gien", status: "published", pages: [page("home", "home"), page("services", "services"), page("privacy", "politique-de-confidentialite")] };
  const structuredDataService = {
    publicOrigin: ORIGIN,
    repository: { findSiteBySlug: async () => site },
    siteSitemapCandidate: async () => ({
      readyToSubmit: true,
      entryCount: 2,
      entries: [
        { url: "https://agences.mondescale.com/agence/gien" },
        { url: "https://agences.mondescale.com/agence/gien/services" },
      ],
    }),
  };
  const performanceService = {
    query: async () => ({
      siteUrl: "sc-domain:mondescale.com",
      pagePrefix: "https://agences.mondescale.com/",
      rowCount: 0,
      rows: [],
    }),
  };

  const result = await new IndexationCoverageService({ structuredDataService, performanceService }).diagnose({
    tenantId: "tenant-1",
    siteSlug: "gien",
    siteUrl: "sc-domain:mondescale.com",
    pagePrefix: "https://agences.mondescale.com/",
  });

  assert.equal(result.searchConsole.analyticsState, "NO_DATA_YET");
  assert.match(result.searchConsole.semantics, /ne prouve pas que l’URL n’est pas indexée/);
  assert.equal(result.summary.notIndexableCount, 1);
  assert.equal(result.summary.waitingForGoogleCount, 2);
  assert.deepEqual(result.invariants, {
    readOnlyGoogle: true,
    googleSubmission: false,
    pageCreation: false,
    publicationMutation: false,
    websiteDesignerMutation: false,
  });
});
