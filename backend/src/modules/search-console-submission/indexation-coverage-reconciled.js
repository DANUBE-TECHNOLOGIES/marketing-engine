"use strict";

const { IndexationCoverageService: LegacyIndexationCoverageService } = require("./indexation-coverage");
const { MANAGED_PAGE_SLUGS, NOINDEX_SLUGS, canonicalPageSlug } = require("../minisite-structured-data/sitemap");

const REASONS = Object.freeze({
  EXPECTED_NOINDEX: "EXPECTED_NOINDEX",
  MANAGED_SITEMAP_ROUTE: "MANAGED_SITEMAP_ROUTE",
});

function isExpectedNoindex(page) {
  return NOINDEX_SLUGS.has(canonicalPageSlug(page?.pageSlug));
}

function isManagedRoute(page) {
  return MANAGED_PAGE_SLUGS.has(canonicalPageSlug(page?.pageSlug));
}

function reconcilePage(page) {
  const item = { ...page };

  if (isExpectedNoindex(item)) {
    return {
      ...item,
      inSitemap: false,
      indexableByLocalContract: false,
      expectedExclusion: true,
      reason: REASONS.EXPECTED_NOINDEX,
    };
  }

  if (isManagedRoute(item)) {
    return {
      ...item,
      inSitemap: true,
      indexableByLocalContract: true,
      managedRoute: true,
      reason: item.observedBySearchConsoleAnalytics
        ? "OBSERVED_BY_SEARCH_CONSOLE"
        : REASONS.MANAGED_SITEMAP_ROUTE,
    };
  }

  return item;
}

function summarize(items, analyticsHasData) {
  const count = (reason) => items.filter((item) => item.reason === reason).length;
  const localIssueCount = count("MISSING_FROM_SITEMAP")
    + count("NOT_INDEXABLE")
    + count("ROBOTS_BLOCKED")
    + count("CANONICAL_MISMATCH");

  let status = "LOCAL_COVERAGE_OK_WAITING_FOR_GOOGLE";
  if (localIssueCount > 0) status = "LOCAL_INDEXATION_ISSUES_FOUND";
  else if (analyticsHasData) status = "SEARCH_CONSOLE_ANALYTICS_AVAILABLE";

  return {
    status,
    publishedPageCount: items.length,
    sitemapExposedPageCount: items.filter((item) => item.inSitemap).length,
    locallyIndexablePageCount: items.filter((item) => item.indexableByLocalContract).length,
    observedBySearchConsoleAnalyticsCount: items.filter((item) => item.observedBySearchConsoleAnalytics).length,
    missingFromSitemapCount: count("MISSING_FROM_SITEMAP"),
    notIndexableCount: count("NOT_INDEXABLE"),
    robotsBlockedCount: count("ROBOTS_BLOCKED"),
    canonicalMismatchCount: count("CANONICAL_MISMATCH"),
    notObservedBySearchConsoleCount: count("NOT_OBSERVED_BY_SEARCH_CONSOLE"),
    waitingForGoogleCount: count("SITEMAP_EXPOSED_WAITING_FOR_GOOGLE") + count(REASONS.MANAGED_SITEMAP_ROUTE),
    expectedNoindexCount: count(REASONS.EXPECTED_NOINDEX),
    managedRouteCount: count(REASONS.MANAGED_SITEMAP_ROUTE),
    localIssueCount,
  };
}

function reconcileDiagnostic(result) {
  const analyticsHasData = result?.searchConsole?.analyticsState === "DATA_AVAILABLE";
  const reconcilePages = (pages) => (pages || []).map(reconcilePage);

  if (Array.isArray(result?.sites)) {
    const sites = result.sites.map((site) => {
      const pages = reconcilePages(site.pages);
      return { ...site, pages, summary: summarize(pages, analyticsHasData) };
    });
    const pages = sites.flatMap((site) => site.pages);
    const summary = summarize(pages, analyticsHasData);
    return {
      ...result,
      version: "mse-25.97",
      legacyCoverageVersion: result.version || "mse-25.69",
      summary,
      sites,
      explanation: summary.localIssueCount > 0
        ? "Des anomalies locales réelles subsistent après exclusion des noindex attendus et normalisation des routes gérées."
        : analyticsHasData
          ? "Le contrat public est cohérent ; les exclusions noindex attendues et routes gérées ne sont pas des incidents. Search Console contient des données pour le périmètre."
          : "Le contrat public est cohérent ; les exclusions noindex attendues et routes gérées ne sont pas des incidents. Search Console ne contient pas encore de données finalisées pour ce périmètre.",
      reconciliation: {
        expectedNoindexCount: summary.expectedNoindexCount,
        managedRouteCount: summary.managedRouteCount,
        falsePositiveLocalIssueCount: summary.expectedNoindexCount + summary.managedRouteCount,
      },
    };
  }

  const pages = reconcilePages(result?.pages);
  const summary = summarize(pages, analyticsHasData);
  return {
    ...result,
    version: "mse-25.97",
    legacyCoverageVersion: result?.version || "mse-25.69",
    pages,
    summary,
    explanation: summary.localIssueCount > 0
      ? "Des anomalies locales réelles subsistent après exclusion des noindex attendus et normalisation des routes gérées."
      : "Le contrat public est cohérent ; les exclusions noindex attendues et routes gérées ne sont pas des incidents.",
    reconciliation: {
      expectedNoindexCount: summary.expectedNoindexCount,
      managedRouteCount: summary.managedRouteCount,
      falsePositiveLocalIssueCount: summary.expectedNoindexCount + summary.managedRouteCount,
    },
  };
}

class IndexationCoverageService extends LegacyIndexationCoverageService {
  async diagnoseNetwork(options = {}) {
    return reconcileDiagnostic(await super.diagnoseNetwork(options));
  }

  async diagnose(options = {}) {
    return reconcileDiagnostic(await super.diagnose(options));
  }
}

module.exports = {
  IndexationCoverageService,
  REASONS,
  reconcileDiagnostic,
  reconcilePage,
  summarize,
};
