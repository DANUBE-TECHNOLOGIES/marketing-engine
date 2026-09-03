"use strict";

function attachLocalIntentTargetQualityReadiness(sitemap, coverage) {
  if (!sitemap?.indexationReadiness?.sites) return sitemap;
  const bySlug = new Map((coverage?.sites || []).map((item) => [String(item.siteSlug || ""), item.intentTargetQuality || {}]));
  const sites = sitemap.indexationReadiness.sites.map((item) => {
    const audit = bySlug.get(String(item.siteSlug || ""));
    if (!audit) return item;
    const blockers = [...(item.blockers || [])];
    const warnings = [...(item.warnings || [])];
    const core = (audit.intents || []).find((intent) => intent.key === "agency");
    if (core?.mapped && core.qualityStatus === "weak") blockers.push("local-core-intent-target-quality-weak");
    else if (core?.mapped && core.qualityStatus === "partial") warnings.push("local-core-intent-target-quality-partial");
    const weakSecondary = (audit.intents || []).filter((intent) => intent.key !== "agency" && intent.mapped && intent.qualityStatus === "weak");
    if (weakSecondary.length) warnings.push("local-secondary-intent-target-quality-weak");
    return { ...item, intentTargetQuality: { status: audit.status, score: audit.score, coreTargetStrong: audit.coreTargetStrong === true, coreTarget: audit.coreTargetQuality || null }, blockers: [...new Set(blockers)], warnings: [...new Set(warnings)], readyToSubmit: blockers.length === 0 };
  });
  const readySites = sites.filter((item) => item.readyToSubmit).length;
  const blockedSites = sites.length - readySites;
  return { ...sitemap, indexationReadiness: { ...sitemap.indexationReadiness, readyToSubmit: blockedSites === 0 && sites.length > 0, readySites, blockedSites, sites }, summary: { ...(sitemap.summary || {}), indexationReadyToSubmit: blockedSites === 0 && sites.length > 0, indexationReadySites: readySites, indexationBlockedSites: blockedSites } };
}

module.exports = { attachLocalIntentTargetQualityReadiness };
