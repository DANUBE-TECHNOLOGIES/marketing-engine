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
const { coverageScope, normalizeCoveragePagePrefix } = require("../src/modules/search-console-submission/routes");

const ORIGIN = "https://agences.mondescale.com";

function page(id, slug, extra = {}) {
  return { id, slug, status: "published", ...extra };
}

test("normalizedUrl removes query, fragment and trailing slash without changing root", () => {
  assert.equal(normalizedUrl("https://agences.mondescale.com/agence/gien/services/?utm=x#top"), "https://agences.mondescale.com/agence/gien/services");
  assert.equal(normalizedUrl("https://agences.mondescale.com/"), "https://agences.mondescale.com/");
});

test("coverage scope converts a preferred host into the strict HTTPS prefix", () => {
  assert.equal(normalizeCoveragePagePrefix("agences.mondescale.com"), "https://agences.mondescale.com/");
  const request = { query: {} };
  const service = { structuredDataService: { publicOrigin: ORIGIN } };
  const previousSite = process.env.SEARCH_CONSOLE_SITE_URL;
  const previousProperty = process.env.SEARCH_CONSOLE_PROPERTY;
  const previousPrefix = process.env.SEARCH_CONSOLE_PAGE_PREFIX;
  const previousHost = process.env.SEARCH_CONSOLE_PREFERRED_HOST;
  delete process.env.SEARCH_CONSOLE_SITE_URL;
  delete process.env.SEARCH_CONSOLE_PROPERTY;
  delete process.env.SEARCH_CONSOLE_PAGE_PREFIX;
  process.env.SEARCH_CONSOLE_PREFERRED_HOST = "agences.mondescale.com";
  try {
    assert.deepEqual(coverageScope(request, service), {
      siteUrl: "sc-domain:mondescale.com",
      pagePrefix: "https://agences.mondescale.com/",
      days: undefined,
    });
  } finally {
    if (previousSite === undefined) delete process.env.SEARCH_CONSOLE_SITE_URL; else process.env.SEARCH_CONSOLE_SITE_URL = previousSite;
    if (previousProperty === undefined) delete process.env.SEARCH_CONSOLE_PROPERTY; else process.env.SEARCH_CONSOLE_PROPERTY = previousProperty;
    if (previousPrefix === undefined) delete process.env.SEARCH_CONSOLE_PAGE_PREFIX; else process.env.SEARCH_CONSOLE_PAGE_PREFIX = previousPrefix;
    if (previousHost === undefined) delete process.env.SEARCH_CONSOLE_PREFERRED_HOST; else process.env.SEARCH_CONSOLE_PREFERRED_HOST = previousHost;
  }
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

test("network diagnostic reads sitemap and Search Console once then groups AgencySitePage coverage by mini-site", async () => {
  const sites = [
    { id: "site-gien", slug: "gien", status: "published", agency: { id: "a1", name: "Gien" }, pages: [page("g-home", "home"), page("g-services", "services")] },
    { id: "site-dax", slug: "dax", status: "published", agency: { id: "a2", name: "Dax" }, pages: [page("d-home", "home"), page("d-contact", "contact")] },
    { id: "draft", slug: "draft", status: "draft", pages: [page("draft-home", "home")] },
  ];
  let analyticsCalls = 0;
  let sitemapCalls = 0;
  const structuredDataService = {
    publicOrigin: ORIGIN,
    repository: { listSites: async () => sites },
    previewSitemap: async () => {
      sitemapCalls += 1;
      return {
        summary: { entryCount: 4, excludedCount: 0 },
        entries: [
          { url: "https://agences.mondescale.com/agence/gien" },
          { url: "https://agences.mondescale.com/agence/gien/services" },
          { url: "https://agences.mondescale.com/agence/dax" },
          { url: "https://agences.mondescale.com/agence/dax/contact" },
        ],
      };
    },
  };
  const performanceService = {
    query: async () => {
      analyticsCalls += 1;
      return {
        siteUrl: "sc-domain:mondescale.com",
        pagePrefix: "https://agences.mondescale.com/",
        rowCount: 1,
        rows: [{ dimensions: { page: "https://agences.mondescale.com/agence/gien/services" } }],
      };
    },
  };

  const result = await new IndexationCoverageService({ structuredDataService, performanceService }).diagnoseNetwork({
    tenantId: "tenant-1",
    siteUrl: "sc-domain:mondescale.com",
    pagePrefix: "https://agences.mondescale.com/",
  });

  assert.equal(sitemapCalls, 1);
  assert.equal(analyticsCalls, 1);
  assert.equal(result.scope, "NETWORK");
  assert.equal(result.publishedSiteCount, 2);
  assert.equal(result.summary.publishedPageCount, 4);
  assert.equal(result.summary.observedBySearchConsoleAnalyticsCount, 1);
  assert.equal(result.sites.length, 2);
  assert.equal(result.sites.find((item) => item.siteSlug === "gien").summary.observedBySearchConsoleAnalyticsCount, 1);
});

test("Search Console failure is isolated from local coverage", async () => {
  const structuredDataService = {
    publicOrigin: ORIGIN,
    repository: { listSites: async () => [{ id: "site-gien", slug: "gien", status: "published", pages: [page("g-home", "home")] }] },
    previewSitemap: async () => ({ summary: { entryCount: 1 }, entries: [{ url: "https://agences.mondescale.com/agence/gien" }] }),
  };
  const performanceService = { query: async () => { throw Object.assign(new Error("token expired"), { code: "TOKEN_EXPIRED" }); } };
  const result = await new IndexationCoverageService({ structuredDataService, performanceService }).diagnoseNetwork({
    tenantId: "tenant-1",
    siteUrl: "sc-domain:mondescale.com",
    pagePrefix: "https://agences.mondescale.com/",
  });
  assert.equal(result.searchConsole.analyticsState, "UNAVAILABLE");
  assert.equal(result.searchConsole.error.code, "TOKEN_EXPIRED");
  assert.equal(result.summary.waitingForGoogleCount, 1);
  assert.equal(result.summary.localIssueCount, 0);
});
