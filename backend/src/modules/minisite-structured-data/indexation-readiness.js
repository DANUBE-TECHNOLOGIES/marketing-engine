"use strict";

function siteSlug(value) {
  return String(value || "").trim();
}

function isIndexationCandidateExclusion(entry) {
  return entry?.reason === "critically-thin-content";
}

function uniqueSiteSlugs(sitemap) {
  const slugs = new Set();
  for (const entry of sitemap?.entries || []) {
    const slug = siteSlug(entry?.siteSlug);
    if (slug) slugs.add(slug);
  }
  for (const entry of sitemap?.excluded || []) {
    if (!isIndexationCandidateExclusion(entry)) continue;
    const slug = siteSlug(entry?.siteSlug);
    if (slug) slugs.add(slug);
  }
  return [...slugs].sort();
}

function siteIndexationReadiness(sitemap, slug) {
  const entries = (sitemap?.entries || []).filter((entry) => siteSlug(entry?.siteSlug) === slug);
  const exclusions = (sitemap?.excluded || []).filter((entry) => siteSlug(entry?.siteSlug) === slug);
  const orphans = (sitemap?.crawlability?.orphanEntries || []).filter((entry) => siteSlug(entry?.siteSlug) === slug);
  const criticalExclusions = exclusions.filter((entry) => entry?.reason === "critically-thin-content");
  const rootPresent = entries.some((entry) => !entry?.type && String(entry?.pageSlug || "") === "");

  const blockers = [];
  if (!rootPresent) blockers.push("missing-indexable-site-root");
  if (orphans.length) blockers.push("orphaned-indexable-entries");

  const warnings = [];
  if (criticalExclusions.length) warnings.push("critically-thin-pages-excluded");
  if (!entries.some((entry) => entry?.type === "inspiration-index")) warnings.push("no-indexable-inspiration-index");
  if (!entries.some((entry) => entry?.type === "destination")) warnings.push("no-indexable-destination-landing");

  return {
    siteSlug: slug,
    readyToSubmit: blockers.length === 0,
    rootPresent,
    indexableEntryCount: entries.length,
    orphanedEntryCount: orphans.length,
    criticallyThinExcludedCount: criticalExclusions.length,
    blockers,
    warnings,
  };
}

function attachIndexationReadiness(sitemap) {
  if (!sitemap || !Array.isArray(sitemap.entries)) return sitemap;

  const sites = uniqueSiteSlugs(sitemap).map((slug) => siteIndexationReadiness(sitemap, slug));
  const readySites = sites.filter((item) => item.readyToSubmit).length;
  const blockedSites = sites.length - readySites;

  return {
    ...sitemap,
    indexationReadiness: {
      readyToSubmit: blockedSites === 0 && sites.length > 0,
      siteCount: sites.length,
      readySites,
      blockedSites,
      sites,
    },
    summary: {
      ...(sitemap.summary || {}),
      indexationReadyToSubmit: blockedSites === 0 && sites.length > 0,
      indexationReadySites: readySites,
      indexationBlockedSites: blockedSites,
    },
  };
}

module.exports = {
  attachIndexationReadiness,
  isIndexationCandidateExclusion,
  siteIndexationReadiness,
  uniqueSiteSlugs,
};