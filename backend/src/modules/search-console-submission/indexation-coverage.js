"use strict";

const {
  canonicalPageSlug,
  isPublishedPage,
  isPublishedSite,
  NOINDEX_SLUGS,
} = require("../minisite-structured-data/sitemap");
const { pageUrl, siteUrl } = require("../minisite-structured-data/utils");
const { SearchConsolePerformanceService } = require("./performance");

const COVERAGE_REASONS = Object.freeze({
  MISSING_FROM_SITEMAP: "MISSING_FROM_SITEMAP",
  NOT_INDEXABLE: "NOT_INDEXABLE",
  ROBOTS_BLOCKED: "ROBOTS_BLOCKED",
  CANONICAL_MISMATCH: "CANONICAL_MISMATCH",
  OBSERVED_BY_SEARCH_CONSOLE: "OBSERVED_BY_SEARCH_CONSOLE",
  NOT_OBSERVED_BY_SEARCH_CONSOLE: "NOT_OBSERVED_BY_SEARCH_CONSOLE",
  SITEMAP_EXPOSED_WAITING_FOR_GOOGLE: "SITEMAP_EXPOSED_WAITING_FOR_GOOGLE",
});

function normalizedUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    url.hash = "";
    url.search = "";
    const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/g, "");
    return `${url.protocol}//${url.host}${pathname}`;
  } catch (_error) {
    return raw.replace(/[?#].*$/g, "").replace(/\/+$/g, "");
  }
}

function pageCanonical(page) {
  const candidates = [
    page?.canonicalUrl,
    page?.canonical,
    page?.seo?.canonicalUrl,
    page?.seo?.canonical,
    page?.metadata?.canonicalUrl,
    page?.metadata?.canonical,
  ];
  return candidates.map(normalizedUrl).find(Boolean) || null;
}

function pageRobots(page) {
  const values = [page?.robots, page?.seo?.robots, page?.metadata?.robots];
  for (const value of values) {
    if (typeof value === "string" && /(^|[,\s])noindex([,\s]|$)/i.test(value)) return "noindex";
    if (value && typeof value === "object" && (value.index === false || value.noindex === true)) return "noindex";
  }
  return null;
}

function publicPageUrl(publicOrigin, siteSlug, page) {
  const slug = canonicalPageSlug(page?.slug);
  return normalizedUrl(slug ? pageUrl(publicOrigin, siteSlug, slug) : siteUrl(publicOrigin, siteSlug));
}

function diagnosticForPage({ page, publicOrigin, siteSlug, sitemapUrls, observedUrls, analyticsHasData }) {
  const url = publicPageUrl(publicOrigin, siteSlug, page);
  const slug = canonicalPageSlug(page?.slug);
  const canonical = pageCanonical(page);
  const robots = pageRobots(page);
  const inSitemap = sitemapUrls.has(url);
  const observed = observedUrls.has(url);
  const localNoindex = NOINDEX_SLUGS.has(slug) || robots === "noindex";
  const canonicalMismatch = Boolean(canonical && canonical !== url);

  let reason;
  if (localNoindex) reason = robots === "noindex" ? COVERAGE_REASONS.ROBOTS_BLOCKED : COVERAGE_REASONS.NOT_INDEXABLE;
  else if (!inSitemap) reason = COVERAGE_REASONS.MISSING_FROM_SITEMAP;
  else if (canonicalMismatch) reason = COVERAGE_REASONS.CANONICAL_MISMATCH;
  else if (observed) reason = COVERAGE_REASONS.OBSERVED_BY_SEARCH_CONSOLE;
  else if (analyticsHasData) reason = COVERAGE_REASONS.NOT_OBSERVED_BY_SEARCH_CONSOLE;
  else reason = COVERAGE_REASONS.SITEMAP_EXPOSED_WAITING_FOR_GOOGLE;

  return {
    pageId: page?.id || null,
    pageSlug: slug,
    url,
    published: isPublishedPage(page),
    inSitemap,
    indexableByLocalContract: !localNoindex,
    robotsDirective: robots,
    declaredCanonical: canonical,
    canonicalMatchesPublicUrl: !canonicalMismatch,
    observedBySearchConsoleAnalytics: observed,
    reason,
  };
}

function summarize(items, analyticsHasData) {
  const count = (reason) => items.filter((item) => item.reason === reason).length;
  const localIssueCount = count(COVERAGE_REASONS.MISSING_FROM_SITEMAP)
    + count(COVERAGE_REASONS.NOT_INDEXABLE)
    + count(COVERAGE_REASONS.ROBOTS_BLOCKED)
    + count(COVERAGE_REASONS.CANONICAL_MISMATCH);

  let status = "LOCAL_COVERAGE_OK_WAITING_FOR_GOOGLE";
  if (localIssueCount > 0) status = "LOCAL_INDEXATION_ISSUES_FOUND";
  else if (analyticsHasData) status = "SEARCH_CONSOLE_ANALYTICS_AVAILABLE";

  return {
    status,
    publishedPageCount: items.length,
    sitemapExposedPageCount: items.filter((item) => item.inSitemap).length,
    locallyIndexablePageCount: items.filter((item) => item.indexableByLocalContract).length,
    observedBySearchConsoleAnalyticsCount: items.filter((item) => item.observedBySearchConsoleAnalytics).length,
    missingFromSitemapCount: count(COVERAGE_REASONS.MISSING_FROM_SITEMAP),
    notIndexableCount: count(COVERAGE_REASONS.NOT_INDEXABLE),
    robotsBlockedCount: count(COVERAGE_REASONS.ROBOTS_BLOCKED),
    canonicalMismatchCount: count(COVERAGE_REASONS.CANONICAL_MISMATCH),
    notObservedBySearchConsoleCount: count(COVERAGE_REASONS.NOT_OBSERVED_BY_SEARCH_CONSOLE),
    waitingForGoogleCount: count(COVERAGE_REASONS.SITEMAP_EXPOSED_WAITING_FOR_GOOGLE),
    localIssueCount,
  };
}

function searchConsoleSummary({ analytics, analyticsError, requestedSiteUrl, requestedPagePrefix }) {
  const analyticsHasData = Number(analytics?.rowCount || 0) > 0;
  return {
    requested: Boolean(String(requestedSiteUrl || "").trim()),
    siteUrl: analytics?.siteUrl || String(requestedSiteUrl || "").trim() || null,
    pagePrefix: analytics?.pagePrefix || String(requestedPagePrefix || "").trim() || null,
    analyticsState: analyticsError ? "UNAVAILABLE" : analyticsHasData ? "DATA_AVAILABLE" : "NO_DATA_YET",
    rowCount: Number(analytics?.rowCount || 0),
    error: analyticsError,
    semantics: "Search Console Analytics prouve uniquement qu’une URL a généré des données de recherche dans la période interrogée. L’absence de ligne ne prouve pas que l’URL n’est pas indexée.",
  };
}

function explanationFor(summary, analyticsHasData) {
  if (summary.localIssueCount > 0) return "Des causes locales exploitables expliquent une couverture d’indexation incomplète avant toute attente de données Google.";
  if (analyticsHasData) return "Le contrat local sitemap/indexabilité est cohérent et Search Console Analytics contient des observations pour le périmètre.";
  return "Le contrat local sitemap/indexabilité est cohérent. Search Console Analytics ne contient pas encore de données finalisées pour ce périmètre ; cela ne permet pas de conclure à une absence d’indexation.";
}

const INVARIANTS = Object.freeze({
  readOnlyGoogle: true,
  googleSubmission: false,
  pageCreation: false,
  publicationMutation: false,
  websiteDesignerMutation: false,
});

class IndexationCoverageService {
  constructor({ structuredDataService, performanceService, provider } = {}) {
    if (!structuredDataService) throw new Error("structuredDataService est requis");
    this.structuredDataService = structuredDataService;
    this.performanceService = performanceService || new SearchConsolePerformanceService({ provider });
  }

  async readAnalytics({ siteUrl, pagePrefix, days }) {
    if (!String(siteUrl || "").trim()) return { analytics: null, analyticsError: null };
    try {
      return {
        analytics: await this.performanceService.query({
          siteUrl,
          pagePrefix,
          days,
          dimensions: ["page"],
          rowLimit: 1000,
        }),
        analyticsError: null,
      };
    } catch (error) {
      return {
        analytics: null,
        analyticsError: {
          code: error?.code || "SEARCH_CONSOLE_ANALYTICS_UNAVAILABLE",
          message: error?.message || "Search Console Analytics indisponible.",
        },
      };
    }
  }

  buildSiteDiagnostic({ site, sitemapUrls, observedUrls, analyticsHasData }) {
    const pages = (site?.pages || []).filter(isPublishedPage).map((page) => diagnosticForPage({
      page,
      publicOrigin: this.structuredDataService.publicOrigin,
      siteSlug: site.slug,
      sitemapUrls,
      observedUrls,
      analyticsHasData,
    }));
    const summary = summarize(pages, analyticsHasData);
    return {
      siteId: site?.id || null,
      siteSlug: site?.slug || null,
      agencyId: site?.agency?.id || site?.agencyId || null,
      agencyName: site?.agency?.name || null,
      summary,
      pages,
    };
  }

  async diagnoseNetwork({ tenantId, siteUrl: searchConsoleSiteUrl, pagePrefix, days = 28 } = {}) {
    const [sites, sitemap, analyticsResult] = await Promise.all([
      this.structuredDataService.repository.listSites(tenantId),
      this.structuredDataService.previewSitemap({ tenantId }),
      this.readAnalytics({ siteUrl: searchConsoleSiteUrl, pagePrefix, days }),
    ]);
    const publishedSites = (sites || []).filter(isPublishedSite);
    const sitemapUrls = new Set((sitemap?.entries || []).map((entry) => normalizedUrl(entry?.url)).filter(Boolean));
    const observedUrls = new Set((analyticsResult.analytics?.rows || []).map((row) => normalizedUrl(row?.dimensions?.page)).filter(Boolean));
    const analyticsHasData = Number(analyticsResult.analytics?.rowCount || 0) > 0;
    const siteDiagnostics = publishedSites.map((site) => this.buildSiteDiagnostic({ site, sitemapUrls, observedUrls, analyticsHasData }));
    const pages = siteDiagnostics.flatMap((site) => site.pages.map((page) => ({ ...page, siteSlug: site.siteSlug, siteId: site.siteId, agencyId: site.agencyId, agencyName: site.agencyName })));
    const summary = summarize(pages, analyticsHasData);

    return {
      version: "mse-25.69",
      scope: "NETWORK",
      publicOrigin: this.structuredDataService.publicOrigin,
      publishedSiteCount: publishedSites.length,
      sitemapUrlCount: Number(sitemap?.summary?.entryCount || sitemap?.entries?.length || 0),
      sitemapExcludedCount: Number(sitemap?.summary?.excludedCount || sitemap?.excluded?.length || 0),
      summary,
      searchConsole: searchConsoleSummary({
        analytics: analyticsResult.analytics,
        analyticsError: analyticsResult.analyticsError,
        requestedSiteUrl: searchConsoleSiteUrl,
        requestedPagePrefix: pagePrefix,
      }),
      explanation: explanationFor(summary, analyticsHasData),
      robotsSemantics: "Le diagnostic ROBOTS_BLOCKED correspond aux directives noindex/robots portées par les données de page. Il ne prétend pas avoir audité à distance un fichier robots.txt public.",
      invariants: INVARIANTS,
      sites: siteDiagnostics,
      observedAt: new Date().toISOString(),
    };
  }

  async diagnose({ tenantId, siteSlug, siteUrl: searchConsoleSiteUrl, pagePrefix, days = 28 } = {}) {
    const slug = String(siteSlug || "").trim();
    if (!slug) {
      const error = new Error("Le slug du mini-site est obligatoire.");
      error.code = "INDEXATION_COVERAGE_SITE_SLUG_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const [site, sitemapCandidate, analyticsResult] = await Promise.all([
      this.structuredDataService.repository.findSiteBySlug(slug, tenantId),
      this.structuredDataService.siteSitemapCandidate({ siteSlug: slug, tenantId }),
      this.readAnalytics({ siteUrl: searchConsoleSiteUrl, pagePrefix, days }),
    ]);
    if (!site) {
      const error = new Error(`Mini-site introuvable : ${slug}`);
      error.code = "INDEXATION_COVERAGE_SITE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const sitemapUrls = new Set((sitemapCandidate.entries || []).map((entry) => normalizedUrl(entry?.url)).filter(Boolean));
    const observedUrls = new Set((analyticsResult.analytics?.rows || []).map((row) => normalizedUrl(row?.dimensions?.page)).filter(Boolean));
    const analyticsHasData = Number(analyticsResult.analytics?.rowCount || 0) > 0;
    const diagnostic = this.buildSiteDiagnostic({ site, sitemapUrls, observedUrls, analyticsHasData });

    return {
      version: "mse-25.69",
      scope: "SITE",
      siteSlug: slug,
      publicOrigin: this.structuredDataService.publicOrigin,
      sitemapUrlCount: Number(sitemapCandidate.entryCount || 0),
      sitemapReadyToSubmit: sitemapCandidate.readyToSubmit === true,
      summary: diagnostic.summary,
      searchConsole: searchConsoleSummary({
        analytics: analyticsResult.analytics,
        analyticsError: analyticsResult.analyticsError,
        requestedSiteUrl: searchConsoleSiteUrl,
        requestedPagePrefix: pagePrefix,
      }),
      explanation: explanationFor(diagnostic.summary, analyticsHasData),
      robotsSemantics: "Le diagnostic ROBOTS_BLOCKED correspond aux directives noindex/robots portées par les données de page. Il ne prétend pas avoir audité à distance un fichier robots.txt public.",
      invariants: INVARIANTS,
      pages: diagnostic.pages,
      observedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  COVERAGE_REASONS,
  INVARIANTS,
  IndexationCoverageService,
  diagnosticForPage,
  explanationFor,
  normalizedUrl,
  pageCanonical,
  pageRobots,
  publicPageUrl,
  searchConsoleSummary,
  summarize,
};
