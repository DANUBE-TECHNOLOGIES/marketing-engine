"use strict";

const { networkSimilarityReport } = require("./similarity-guard");
const { preRolloutQualityReport } = require("./pre-rollout-quality");
const {
  filterSitemapReadiness,
  hardenQualityReport,
} = require("./editorial-hardening-patch");

const INSTALLED = Symbol.for("mse-25.30.published-site-scope-installed");

function clean(value) {
  return String(value || "").trim();
}

function normalizeSlug(value) {
  return clean(value).toLocaleLowerCase("fr-FR");
}

function isPublishedSite(site = {}) {
  return clean(site?.status).toLocaleLowerCase("fr-FR") === "published";
}

function unpublishedSites(sites = []) {
  return (Array.isArray(sites) ? sites : [])
    .filter((site) => site?.slug)
    .filter((site) => !isPublishedSite(site))
    .map((site) => ({
      agencyId: site?.agencyId ?? site?.agency?.id ?? null,
      siteSlug: clean(site.slug),
      city: site?.agency?.city || null,
      status: clean(site?.status) || null,
      publishedAt: site?.publishedAt || null,
      reason: "site-not-published",
    }));
}

function mergeExcludedAgencies(existing = [], dynamic = []) {
  const bySlug = new Map();
  for (const agency of Array.isArray(existing) ? existing : []) {
    const key = normalizeSlug(agency?.siteSlug);
    if (!key) continue;
    bySlug.set(key, {
      ...agency,
      reason: agency?.reason || "configured-exclusion",
    });
  }
  for (const agency of Array.isArray(dynamic) ? dynamic : []) {
    const key = normalizeSlug(agency?.siteSlug);
    if (!key) continue;
    const previous = bySlug.get(key) || {};
    bySlug.set(key, {
      ...agency,
      ...previous,
      agencyId: previous?.agencyId ?? agency?.agencyId ?? null,
      siteSlug: previous?.siteSlug || agency?.siteSlug,
      city: previous?.city || agency?.city || null,
      status: agency?.status ?? previous?.status ?? null,
      publishedAt: agency?.publishedAt ?? previous?.publishedAt ?? null,
      reason: previous?.reason === "configured-exclusion"
        ? "configured-exclusion"
        : (agency?.reason || previous?.reason || "site-not-published"),
      alsoUnpublished: true,
    });
  }
  return [...bySlug.values()];
}

function recomputeSummary(plan = {}, similarity = {}, quality = {}, excludedAgencies = []) {
  const plans = Array.isArray(plan.plans) ? plan.plans : [];
  const sitemapReadiness = plan.sitemapReadiness || {};
  return {
    ...(plan.summary || {}),
    agenciesProcessed: plans.length,
    agenciesExcluded: excludedAgencies.length,
    pagesProcessed: plans.reduce((sum, item) => sum + Number(item?.summary?.pagesProcessed || 0), 0),
    pagesChanged: plans.reduce((sum, item) => sum + Number(item?.summary?.pagesChanged || 0), 0),
    pagesExcludedNoindex: plans.reduce((sum, item) => sum + Number(item?.summary?.pagesExcludedNoindex || 0), 0),
    pagesExcludedManagedRoute: plans.reduce((sum, item) => sum + Number(item?.summary?.pagesExcludedManagedRoute || 0), 0),
    similarityConflicts: Number(similarity?.conflictCount || 0),
    similarityBlockingConflicts: Number(similarity?.blockingConflictCount || 0),
    similarityAdvisoryConflicts: Number(similarity?.advisoryConflictCount || 0),
    qualityBlockingIssues: Number(quality?.blockingCount || 0),
    qualityWarnings: Number(quality?.warningCount || 0),
    sitemapSitesNotReady: Number(sitemapReadiness?.notReadyCount || 0),
    rolloutBlocked: Boolean(similarity?.blocked || quality?.blocked || sitemapReadiness?.blocked),
  };
}

function installPublishedSiteScope(ServiceClass) {
  if (!ServiceClass?.prototype || ServiceClass.prototype[INSTALLED]) return ServiceClass;
  const prototype = ServiceClass.prototype;
  const originalBuildNetwork = prototype.buildNetworkContentOptimization;
  const originalHealth = prototype.health;

  if (typeof originalBuildNetwork !== "function") {
    throw new Error("MSE-25.30 published site scope requires network content optimization.");
  }

  prototype.buildNetworkContentOptimization = async function buildPublishedNetworkContentOptimization(options = {}) {
    const plan = await originalBuildNetwork.call(this, options);
    const sites = typeof this?.repository?.listSites === "function"
      ? await this.repository.listSites()
      : [];
    const dynamicExcluded = unpublishedSites(sites);
    const dynamicSlugs = dynamicExcluded.map((site) => normalizeSlug(site.siteSlug));
    const excludedSiteSlugs = [...new Set([
      ...(Array.isArray(plan?.excludedSiteSlugs) ? plan.excludedSiteSlugs : []).map(normalizeSlug),
      ...dynamicSlugs,
    ].filter(Boolean))];
    const excludedSet = new Set(excludedSiteSlugs);
    const plans = (Array.isArray(plan?.plans) ? plan.plans : []).filter(
      (item) => !excludedSet.has(normalizeSlug(item?.siteSlug))
    );
    const excludedAgencies = mergeExcludedAgencies(plan?.excludedAgencies, dynamicExcluded);
    const similarity = networkSimilarityReport(plans, {
      threshold: Number(options.similarityThreshold ?? 0.78),
      minimumWords: Number(options.minimumWords ?? 80),
    });
    const quality = hardenQualityReport(preRolloutQualityReport(plans, {
      minimumWords: Number(options.qualityMinimumWords ?? 120),
    }));
    const sitemapReadiness = filterSitemapReadiness(plan?.sitemapReadiness || {}, excludedSiteSlugs);
    const enriched = {
      ...plan,
      plans,
      similarity,
      quality,
      sitemapReadiness,
      excludedSiteSlugs,
      excludedAgencies,
      unpublishedSites: dynamicExcluded,
    };
    return {
      ...enriched,
      summary: recomputeSummary(enriched, similarity, quality, excludedAgencies),
    };
  };

  if (typeof originalHealth === "function") {
    prototype.health = function healthWithPublishedSiteScope(...args) {
      return {
        ...originalHealth.apply(this, args),
        publishedSiteScopeGuard: true,
      };
    };
  }

  Object.defineProperty(prototype, INSTALLED, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return ServiceClass;
}

module.exports = {
  installPublishedSiteScope,
  isPublishedSite,
  mergeExcludedAgencies,
  unpublishedSites,
};
