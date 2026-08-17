"use strict";

function attachLocalSeoReadiness(sitemap, coverage) {
  if (!sitemap?.indexationReadiness?.sites || !Array.isArray(coverage?.sites)) return sitemap;
  const coverageBySlug = new Map(coverage.sites.map((item) => [String(item.siteSlug || ""), item]));
  const sites = sitemap.indexationReadiness.sites.map((item) => {
    const local = coverageBySlug.get(String(item.siteSlug || ""));
    if (!local) return { ...item, readyToSubmit: false, blockers: [...(item.blockers || []), "local-seo-audit-missing"], localSeo: null };
    const blockingGaps = (local.gaps || []).filter((gap) => gap.severity === "critical" || gap.severity === "high");
    const score = Number(local.score || 0);
    const scoreTargetMet = score >= 85;
    const localSeoReady = blockingGaps.length === 0;
    return {
      ...item,
      readyToSubmit: item.readyToSubmit === true && localSeoReady,
      blockers: localSeoReady ? [...(item.blockers || [])] : [...new Set([...(item.blockers || []), "local-seo-not-ready"])],
      warnings: [...new Set([...(item.warnings || []), ...(local.gaps || []).filter((gap) => gap.severity === "medium").map((gap) => `local-seo:${gap.code}`)])],
      localSeo: { score, status: local.status, scoreTargetMet, ready: localSeoReady, blockingGapCount: blockingGaps.length },
    };
  });
  const readySites = sites.filter((item) => item.readyToSubmit).length;
  const blockedSites = sites.length - readySites;
  return {
    ...sitemap,
    indexationReadiness: { ...sitemap.indexationReadiness, readyToSubmit: blockedSites === 0 && sites.length > 0, readySites, blockedSites, sites },
    summary: { ...(sitemap.summary || {}), indexationReadyToSubmit: blockedSites === 0 && sites.length > 0, indexationReadySites: readySites, indexationBlockedSites: blockedSites, localSeoAverageScore: coverage.summary?.averageScore || 0 },
  };
}

module.exports = { attachLocalSeoReadiness };
