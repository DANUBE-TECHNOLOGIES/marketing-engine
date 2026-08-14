"use strict";

const {
  contentTargetsAgency,
} = require("../ai-content/editorial-targeting");

function agencyIdForSite(site) {
  const value = site?.agency?.id ?? site?.agencyId ?? null;
  if (value === null || value === undefined) return null;
  const id = String(value).trim();
  return id || null;
}

function siteHasPublicInspirations(site, inspirations = []) {
  const agencyId = agencyIdForSite(site);
  if (!agencyId) return false;
  return (inspirations || []).some((content) => contentTargetsAgency(content, agencyId));
}

function applyInspirationIndexabilityContract(sitemap, sites = [], inspirations = []) {
  if (!sitemap || !Array.isArray(sitemap.entries)) return sitemap;

  const allowedSiteSlugs = new Set(
    (sites || [])
      .filter((site) => siteHasPublicInspirations(site, inspirations))
      .map((site) => String(site?.slug || "").trim())
      .filter(Boolean)
  );

  const removed = sitemap.entries.filter(
    (entry) => entry?.type === "inspiration-index" && !allowedSiteSlugs.has(String(entry.siteSlug || "").trim())
  );
  const entries = sitemap.entries.filter(
    (entry) => entry?.type !== "inspiration-index" || allowedSiteSlugs.has(String(entry.siteSlug || "").trim())
  );

  if (!removed.length) return sitemap;

  const excluded = [
    ...(Array.isArray(sitemap.excluded) ? sitemap.excluded : []),
    ...removed.map((entry) => ({
      type: "inspiration-index",
      siteSlug: entry.siteSlug,
      agencyId: entry.agencyId,
      reason: "no-public-inspirations-for-agency",
    })),
  ];

  return {
    ...sitemap,
    entries,
    excluded,
    summary: {
      ...(sitemap.summary || {}),
      inspirationIndexPages: entries.filter((entry) => entry.type === "inspiration-index").length,
      entryCount: entries.length,
      excludedCount: excluded.length,
    },
  };
}

module.exports = {
  agencyIdForSite,
  siteHasPublicInspirations,
  applyInspirationIndexabilityContract,
};