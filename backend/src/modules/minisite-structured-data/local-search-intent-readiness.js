"use strict";

function attachLocalSearchIntentReadiness(sitemap, coverage) {
  if (!sitemap?.indexationReadiness?.sites) return sitemap;
  const bySlug = new Map((coverage?.sites || []).map((item) => [String(item.siteSlug || ""), item.searchIntentCoverage || {}]));
  const sites = sitemap.indexationReadiness.sites.map((item) => {
    const audit = bySlug.get(String(item.siteSlug || ""));
    if (!audit) return item;
    const blockers = [...(item.blockers || [])];
    const warnings = [...(item.warnings || [])];
    const agencyIntent = (audit.intents || []).find((intent) => intent.key === "agency");
    if (!agencyIntent?.localQualified) blockers.push("local-core-search-intent-missing");
    if (audit.status === "weak") warnings.push("local-search-intent-coverage-weak");
    else if (audit.status === "partial") warnings.push("local-search-intent-coverage-partial");
    return { ...item, searchIntentCoverage: { status: audit.status, score: audit.score, coveredIntentCount: audit.coveredIntentCount, intentCount: audit.intentCount }, blockers: [...new Set(blockers)], warnings: [...new Set(warnings)], readyToSubmit: blockers.length === 0 };
  });
  const readySites = sites.filter((item) => item.readyToSubmit).length;
  const blockedSites = sites.length - readySites;
  return { ...sitemap, indexationReadiness: { ...sitemap.indexationReadiness, readyToSubmit: blockedSites === 0 && sites.length > 0, readySites, blockedSites, sites }, summary: { ...(sitemap.summary || {}), indexationReadyToSubmit: blockedSites === 0 && sites.length > 0, indexationReadySites: readySites, indexationBlockedSites: blockedSites } };
}

module.exports = { attachLocalSearchIntentReadiness };
