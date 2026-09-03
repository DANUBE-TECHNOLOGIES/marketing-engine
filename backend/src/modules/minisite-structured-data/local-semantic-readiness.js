"use strict";

function attachLocalSemanticReadiness(sitemap, coverage) {
  if (!sitemap?.indexationReadiness?.sites) return sitemap;
  const bySlug = new Map((coverage?.sites || []).map((item) => [String(item.siteSlug || ""), item.semanticDepth || {}]));
  const sites = sitemap.indexationReadiness.sites.map((item) => {
    const semantic = bySlug.get(String(item.siteSlug || ""));
    if (!semantic) return item;
    const blockers = [...(item.blockers || [])];
    const warnings = [...(item.warnings || [])];
    if (semantic.status === "shallow") blockers.push("local-semantic-depth-insufficient");
    else if (semantic.status === "partial") warnings.push("local-semantic-depth-partial");
    return { ...item, semanticDepth: { status: semantic.status, score: semantic.depthScore, wordCount: semantic.wordCount }, blockers: [...new Set(blockers)], warnings: [...new Set(warnings)], readyToSubmit: blockers.length === 0 };
  });
  const readySites = sites.filter((item) => item.readyToSubmit).length;
  const blockedSites = sites.length - readySites;
  return { ...sitemap, indexationReadiness: { ...sitemap.indexationReadiness, readyToSubmit: blockedSites === 0 && sites.length > 0, readySites, blockedSites, sites }, summary: { ...(sitemap.summary || {}), indexationReadyToSubmit: blockedSites === 0 && sites.length > 0, indexationReadySites: readySites, indexationBlockedSites: blockedSites } };
}

module.exports = { attachLocalSemanticReadiness };
