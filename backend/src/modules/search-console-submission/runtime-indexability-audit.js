"use strict";

const { MANAGED_PAGE_SLUGS } = require("../minisite-structured-data/sitemap");
const { normalizeUrl } = require("./public-indexability-observer");

function uniqueSorted(values) {
  return [...new Set((values || []).map(normalizeUrl).filter(Boolean))].sort();
}

function parseSitemapUrls(xml) {
  const urls = [];
  const source = String(xml || "");
  for (const match of source.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    const decoded = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    const normalized = normalizeUrl(decoded);
    if (normalized) urls.push(normalized);
  }
  return uniqueSorted(urls);
}

function sitemapDirective(robotsText) {
  const values = [];
  for (const rawLine of String(robotsText || "").split(/\r?\n/)) {
    const match = rawLine.replace(/#.*$/g, "").trim().match(/^sitemap\s*:\s*(.+)$/i);
    if (match) values.push(match[1].trim());
  }
  return uniqueSorted(values);
}

async function fetchText(fetchImpl, url, { timeoutMs = 5000, accept = "*/*" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: accept, "User-Agent": "Mondescale-Runtime-Readiness/1.0" },
    });
    return {
      url,
      finalUrl: response.url || url,
      status: Number(response.status || 0),
      ok: response.ok === true,
      contentType: response.headers?.get?.("content-type") || null,
      text: await response.text(),
      error: null,
    };
  } catch (error) {
    return {
      url,
      finalUrl: null,
      status: null,
      ok: false,
      contentType: null,
      text: "",
      error: error?.name === "AbortError" ? "timeout" : error?.message || String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStableSitemap(fetchImpl, url, { timeoutMs = 5000, expectedUrlCount = 0 } = {}) {
  const options = { timeoutMs, accept: "application/xml,text/xml,*/*;q=0.1" };
  const first = await fetchText(fetchImpl, url, options);
  const firstUrls = first.ok ? parseSitemapUrls(first.text) : [];

  if (!first.ok || firstUrls.length || expectedUrlCount <= 0) {
    return { response: first, urls: firstUrls, retried: false, recovered: false };
  }

  const second = await fetchText(fetchImpl, url, options);
  const secondUrls = second.ok ? parseSitemapUrls(second.text) : [];
  return {
    response: second,
    urls: secondUrls,
    retried: true,
    recovered: second.ok && secondUrls.length > 0,
    firstObservation: {
      status: first.status,
      ok: first.ok,
      contentType: first.contentType,
      parsedUrlCount: firstUrls.length,
    },
  };
}

function isActionableCoveragePage(page) {
  const reason = String(page?.reason || "");
  const slug = String(page?.pageSlug || "");
  if (reason === "ROBOTS_BLOCKED" || reason === "CANONICAL_MISMATCH") return true;
  if (reason === "MISSING_FROM_SITEMAP") return !MANAGED_PAGE_SLUGS.has(slug);
  return false;
}

function coverageSummary(coverage) {
  const sites = coverage?.sites || [];
  const pages = sites.flatMap((site) => site?.pages || []);
  const actionablePages = pages.filter(isActionableCoveragePage);
  const expectedNoindexPages = pages.filter((page) => page?.reason === "NOT_INDEXABLE");
  const managedRoutePages = pages.filter((page) => page?.reason === "MISSING_FROM_SITEMAP" && MANAGED_PAGE_SLUGS.has(String(page?.pageSlug || "")));
  return {
    siteCount: sites.length,
    publishedPageCount: pages.length,
    localIssuePageCount: actionablePages.length,
    expectedNoindexPageCount: expectedNoindexPages.length,
    managedRoutePageCount: managedRoutePages.length,
    analyticsRowCount: Number(coverage?.searchConsole?.rowCount ?? coverage?.analytics?.rowCount ?? coverage?.analyticsRowCount ?? 0),
    googleDataState: coverage?.searchConsole?.analyticsState || coverage?.analytics?.dataState || coverage?.dataState || coverage?.lifecycle || null,
  };
}

class RuntimeIndexabilityAuditService {
  constructor({ structuredDataService, publicIndexabilityObserver, fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
    this.structuredDataService = structuredDataService;
    this.observer = publicIndexabilityObserver;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async audit({ tenantId, coverage = null, limit = 500 } = {}) {
    const publicOrigin = String(this.structuredDataService.publicOrigin || "https://agences.mondescale.com").replace(/\/+$/g, "");
    const sitemapUrl = `${publicOrigin}/sitemap.xml`;
    const robotsUrl = `${publicOrigin}/robots.txt`;
    const internal = await this.structuredDataService.previewSitemap({ tenantId });
    const expectedUrls = uniqueSorted((internal?.entries || []).map((entry) => entry?.url));
    const auditUrls = expectedUrls.slice(0, Math.max(1, Math.min(500, Number(limit || 500))));

    const [stableSitemap, robots, pageAudit] = await Promise.all([
      fetchStableSitemap(this.fetchImpl, sitemapUrl, { timeoutMs: this.timeoutMs, expectedUrlCount: expectedUrls.length }),
      fetchText(this.fetchImpl, robotsUrl, { timeoutMs: this.timeoutMs, accept: "text/plain,*/*;q=0.1" }),
      this.observer.audit({ urls: auditUrls, publicOrigin }),
    ]);

    const publicSitemap = stableSitemap.response;
    const publicUrls = stableSitemap.urls;
    const publicSet = new Set(publicUrls);
    const expectedSet = new Set(expectedUrls);
    const missingFromPublicSitemap = expectedUrls.filter((url) => !publicSet.has(url));
    const extraInPublicSitemap = publicUrls.filter((url) => !expectedSet.has(url));
    const robotsSitemaps = robots.ok ? sitemapDirective(robots.text) : [];
    const robotsDeclaresSitemap = robotsSitemaps.includes(normalizeUrl(sitemapUrl));
    const local = coverageSummary(coverage);

    const blockers = [];
    const warnings = [];
    if (!publicSitemap.ok) blockers.push("PUBLIC_SITEMAP_UNAVAILABLE");
    if (publicSitemap.ok && !publicUrls.length && expectedUrls.length) blockers.push("PUBLIC_SITEMAP_EMPTY_OR_INVALID");
    if (missingFromPublicSitemap.length) blockers.push("PUBLIC_SITEMAP_MISSING_EXPECTED_URLS");
    if (local.localIssuePageCount) blockers.push("LOCAL_INDEXABILITY_ISSUES");
    if (pageAudit.summary?.publicIssueCount) blockers.push("PUBLIC_PAGE_INDEXABILITY_ISSUES");
    if (!robots.ok && robots.status !== 404) warnings.push("ROBOTS_OBSERVATION_UNAVAILABLE");
    if (robots.ok && !robotsDeclaresSitemap) warnings.push("ROBOTS_SITEMAP_DIRECTIVE_MISSING");
    if (extraInPublicSitemap.length) warnings.push("PUBLIC_SITEMAP_HAS_EXTRA_URLS");
    if (pageAudit.summary?.fetchUnavailableCount) warnings.push("PARTIAL_PAGE_OBSERVATION");
    if (stableSitemap.recovered) warnings.push("TRANSIENT_EMPTY_SITEMAP_OBSERVATION_RECOVERED");
    if (local.expectedNoindexPageCount) warnings.push("EXPECTED_NOINDEX_PAGES_EXCLUDED");
    if (local.managedRoutePageCount) warnings.push("MANAGED_SITEMAP_ROUTES_NORMALIZED");

    let verdict = "READY_FOR_GOOGLE_DISCOVERY";
    if (blockers.length) verdict = "BLOCKED_INDEXABILITY";
    else if (local.googleDataState === "NO_DATA_YET" || local.googleDataState === "UNAVAILABLE" || local.analyticsRowCount === 0) verdict = "READY_WAITING_FOR_SEARCH_CONSOLE_DATA";

    return {
      version: "mse-25.84",
      verdict,
      readyForGoogleDiscovery: blockers.length === 0,
      publicOrigin,
      summary: {
        ...local,
        expectedSitemapUrlCount: expectedUrls.length,
        publicSitemapUrlCount: publicUrls.length,
        missingFromPublicSitemapCount: missingFromPublicSitemap.length,
        extraInPublicSitemapCount: extraInPublicSitemap.length,
        auditedPageCount: pageAudit.summary?.observedUrlCount || 0,
        reachablePageCount: pageAudit.summary?.reachableCount || 0,
        publicIssueCount: pageAudit.summary?.publicIssueCount || 0,
        canonicalMismatchCount: pageAudit.summary?.canonicalMismatchCount || 0,
        noindexCount: pageAudit.summary?.noindexCount || 0,
        robotsBlockedCount: pageAudit.summary?.robotsBlockedCount || 0,
        httpErrorCount: pageAudit.summary?.httpErrorCount || 0,
      },
      sitemap: {
        url: sitemapUrl,
        status: publicSitemap.status,
        ok: publicSitemap.ok,
        contentType: publicSitemap.contentType,
        error: publicSitemap.error,
        observationRetried: stableSitemap.retried,
        transientEmptyObservationRecovered: stableSitemap.recovered,
        firstObservation: stableSitemap.firstObservation || null,
        missingUrls: missingFromPublicSitemap,
        extraUrls: extraInPublicSitemap,
      },
      robots: {
        url: robotsUrl,
        status: robots.status,
        ok: robots.ok || robots.status === 404,
        observed: robots.ok,
        absentAllowByDefault: robots.status === 404,
        error: robots.error,
        sitemapDirectives: robotsSitemaps,
        declaresPublicSitemap: robotsDeclaresSitemap,
      },
      pages: pageAudit,
      blockers,
      warnings,
      truncated: expectedUrls.length > auditUrls.length,
      invariants: {
        readOnly: true,
        googleWrites: false,
        sitemapSubmission: false,
        automaticRemediation: false,
        pageMutation: false,
        websiteDesignerMutation: false,
      },
      observedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  RuntimeIndexabilityAuditService,
  coverageSummary,
  fetchStableSitemap,
  fetchText,
  isActionableCoveragePage,
  parseSitemapUrls,
  sitemapDirective,
};
