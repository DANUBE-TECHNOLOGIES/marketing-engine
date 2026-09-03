"use strict";

function attachLocalIntentTargetReadiness(sitemap, mappings) {
  if (!sitemap?.indexationReadiness?.sites) return sitemap;
  const bySlug = new Map((mappings || []).map((item) => [String(item.siteSlug || ""), item]));
  const sites = sitemap.indexationReadiness.sites.map((item) => {
    const mapping = bySlug.get(String(item.siteSlug || ""));
    if (!mapping) return item;
    const blockers = [...(item.blockers || [])];
    const warnings = [...(item.warnings || [])];
    if (!mapping.coreIntentMapped) blockers.push("local-core-intent-target-missing");
    if ((mapping.diffuseIntents || []).length) warnings.push("local-intent-targets-diffuse");
    if (mapping.status === "weak") warnings.push("local-intent-target-coverage-weak");
    else if (mapping.status === "partial") warnings.push("local-intent-target-coverage-partial");
    return {
      ...item,
      intentTargetMapping: {
        status: mapping.status,
        score: mapping.score,
        mappedIntentCount: mapping.mappedIntentCount,
        intentCount: mapping.intentCount,
        diffuseIntents: mapping.diffuseIntents,
      },
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
      readyToSubmit: blockers.length === 0,
    };
  });
  const readySites = sites.filter((item) => item.readyToSubmit).length;
  const blockedSites = sites.length - readySites;
  return {
    ...sitemap,
    indexationReadiness: { ...sitemap.indexationReadiness, readyToSubmit: blockedSites === 0 && sites.length > 0, readySites, blockedSites, sites },
    summary: { ...(sitemap.summary || {}), indexationReadyToSubmit: blockedSites === 0 && sites.length > 0, indexationReadySites: readySites, indexationBlockedSites: blockedSites },
  };
}

module.exports = { attachLocalIntentTargetReadiness };
