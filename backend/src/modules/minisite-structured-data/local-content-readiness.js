"use strict";

function attachLocalContentReadiness(sitemap, uniqueness) {
  if (!sitemap?.indexationReadiness?.sites || !Array.isArray(uniqueness?.sites)) return sitemap;
  const bySlug = new Map(uniqueness.sites.map((item) => [String(item.siteSlug || ""), item]));
  const sites = sitemap.indexationReadiness.sites.map((item) => {
    const audit = bySlug.get(String(item.siteSlug || ""));
    if (!audit) return item;
    const blocking = audit.status === "duplicate-risk";
    const warnings = [...(item.warnings || [])];
    if (audit.status === "review") warnings.push("local-content-similarity-review");
    return {
      ...item,
      readyToSubmit: item.readyToSubmit === true && !blocking,
      blockers: blocking ? [...new Set([...(item.blockers || []), "local-content-duplicate-risk"])] : [...(item.blockers || [])],
      warnings: [...new Set(warnings)],
      localContentUniqueness: {
        status: audit.status,
        score: audit.score,
        strongestSimilarity: audit.strongestSimilarity,
        duplicatePairCount: audit.duplicatePairCount,
        ready: !blocking,
      },
    };
  });
  const readySites = sites.filter((item) => item.readyToSubmit).length;
  const blockedSites = sites.length - readySites;
  return {
    ...sitemap,
    indexationReadiness: { ...sitemap.indexationReadiness, readyToSubmit: blockedSites === 0 && sites.length > 0, readySites, blockedSites, sites },
    summary: { ...(sitemap.summary || {}), indexationReadyToSubmit: blockedSites === 0 && sites.length > 0, indexationReadySites: readySites, indexationBlockedSites: blockedSites, localContentDuplicateRiskSites: uniqueness.summary?.duplicateRiskSites || 0 },
  };
}

module.exports = { attachLocalContentReadiness };
