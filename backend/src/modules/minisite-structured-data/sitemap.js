"use strict";

const {
  contentIndexesForAgency,
} = require("../ai-content/editorial-targeting");
const {
  cleanText,
  normalizeSlug,
  pageUrl,
  siteUrl,
} = require("./utils");

const NOINDEX_SLUGS = new Set([
  "mentions-legales",
  "mentions_legales",
  "confidentialite",
  "politique-de-confidentialite",
  "privacy",
]);

const PAGE_ALIASES = new Map([
  ["home", ""],
  ["accueil", ""],
  ["index", ""],
  ["inspirations", "inspiration"],
]);

const MANAGED_PAGE_SLUGS = new Set([
  "inspiration",
]);

function canonicalPageSlug(value) {
  const slug = normalizeSlug(value);
  return PAGE_ALIASES.has(slug)
    ? PAGE_ALIASES.get(slug)
    : slug;
}

function isPublishedSite(site) {
  return Boolean(site && (site.status === "published" || site.publishedAt));
}

function isPublishedPage(page) {
  if (!page) return false;
  if (page.published === true) return true;
  if (page.status === "published") return true;
  return Boolean(page.publishedAt);
}

function shouldIndexPage(page) {
  const slug = canonicalPageSlug(page?.slug);
  if (NOINDEX_SLUGS.has(slug)) return false;
  return isPublishedPage(page);
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function pagePriority(slug) {
  const normalized = canonicalPageSlug(slug);
  if (!normalized) return 1;
  if (["agence", "services", "destinations", "contact"].includes(normalized)) return 0.8;
  if (["equipe", "inspiration", "engagements", "partenaires", "avis"].includes(normalized)) return 0.6;
  return 0.5;
}

function pageChangeFrequency(slug) {
  const normalized = canonicalPageSlug(slug);
  if (!normalized) return "weekly";
  if (["destinations", "inspiration", "avis"].includes(normalized)) return "weekly";
  return "monthly";
}

function inspirationIndexUrl(publicOrigin, siteSlug) {
  const origin = String(publicOrigin || "").replace(/\/+$/g, "");
  return `${origin}/agence/${encodeURIComponent(siteSlug)}/inspiration`;
}

function inspirationUrl(publicOrigin, siteSlug, contentSlug) {
  const origin = String(publicOrigin || "").replace(/\/+$/g, "");
  return `${origin}/agence/${encodeURIComponent(siteSlug)}/inspiration/${encodeURIComponent(contentSlug)}`;
}

function destinationUrl(publicOrigin, siteSlug, destinationSlug) {
  const origin = String(publicOrigin || "").replace(/\/+$/g, "");
  return `${origin}/agence/${encodeURIComponent(siteSlug)}/destination/${encodeURIComponent(destinationSlug)}`;
}

function buildPublicSitemap({ sites, inspirations, destinations, publicOrigin } = {}) {
  const entries = [];
  const excluded = [];
  const publishedSitesByAgency = new Map();
  const publishedSites = [];

  for (const site of sites || []) {
    if (!isPublishedSite(site)) {
      excluded.push({
        type: "site",
        siteId: site.id,
        siteSlug: site.slug,
        reason: "site-not-published",
      });
      continue;
    }

    publishedSites.push(site);
    const agencyId = site.agency?.id || site.agencyId;
    if (agencyId !== undefined && agencyId !== null) {
      publishedSitesByAgency.set(String(agencyId), site);
    }

    const publishedPages = (site.pages || []).filter(shouldIndexPage);
    const homePage = publishedPages.find((page) => canonicalPageSlug(page.slug) === "");

    entries.push({
      url: siteUrl(publicOrigin, site.slug),
      lastModified: normalizeDate(homePage?.updatedAt || site.updatedAt || site.publishedAt),
      changeFrequency: "weekly",
      priority: 1,
      agencyId,
      siteSlug: site.slug,
      pageSlug: "",
    });

    entries.push({
      url: inspirationIndexUrl(publicOrigin, site.slug),
      lastModified: normalizeDate(site.updatedAt || site.publishedAt),
      changeFrequency: "weekly",
      priority: 0.6,
      agencyId,
      siteSlug: site.slug,
      pageSlug: "inspiration",
      type: "inspiration-index",
    });

    for (const page of site.pages || []) {
      const rawSlug = normalizeSlug(page.slug);
      const slug = canonicalPageSlug(rawSlug);
      if (!rawSlug) continue;

      if (!shouldIndexPage(page)) {
        excluded.push({
          type: "page",
          siteId: site.id,
          siteSlug: site.slug,
          pageId: page.id,
          pageSlug: rawSlug,
          reason: NOINDEX_SLUGS.has(slug) ? "noindex-page" : "page-not-published",
        });
        continue;
      }

      if (!slug) {
        excluded.push({
          type: "page",
          siteId: site.id,
          siteSlug: site.slug,
          pageId: page.id,
          pageSlug: rawSlug,
          reason: "canonical-home-alias",
        });
        continue;
      }

      if (MANAGED_PAGE_SLUGS.has(slug)) {
        excluded.push({
          type: "page",
          siteId: site.id,
          siteSlug: site.slug,
          pageId: page.id,
          pageSlug: rawSlug,
          reason: "canonical-route-managed",
        });
        continue;
      }

      entries.push({
        url: pageUrl(publicOrigin, site.slug, slug),
        lastModified: normalizeDate(page.updatedAt || page.publishedAt || site.updatedAt || site.publishedAt),
        changeFrequency: pageChangeFrequency(slug),
        priority: pagePriority(slug),
        agencyId,
        siteSlug: site.slug,
        pageSlug: slug,
      });
    }
  }

  for (const destination of destinations || []) {
    const slug = String(destination?.slug || "").trim();
    if (!slug) {
      excluded.push({
        type: "destination",
        destinationId: destination?.id,
        reason: "missing-slug",
      });
      continue;
    }

    for (const site of publishedSites) {
      const agencyId = site.agency?.id || site.agencyId;
      entries.push({
        url: destinationUrl(publicOrigin, site.slug, slug),
        lastModified: normalizeDate(destination.updatedAt || destination.publishedAt || site.updatedAt),
        changeFrequency: "monthly",
        priority: 0.7,
        agencyId,
        siteSlug: site.slug,
        pageSlug: `destination/${slug}`,
        destinationId: destination.id,
        destinationSlug: slug,
        type: "destination",
      });
    }
  }

  for (const inspiration of inspirations || []) {
    const slug = String(inspiration?.slug || "").trim();
    if (!slug) {
      excluded.push({ type: "inspiration", contentId: inspiration?.id, reason: "missing-slug" });
      continue;
    }

    let indexed = false;
    for (const [agencyId, site] of publishedSitesByAgency.entries()) {
      if (!contentIndexesForAgency(inspiration, agencyId)) continue;

      entries.push({
        url: inspirationUrl(publicOrigin, site.slug, slug),
        lastModified: normalizeDate(inspiration.updatedAt || inspiration.publishedAt || site.updatedAt),
        changeFrequency: "monthly",
        priority: 0.65,
        agencyId: site.agency?.id || site.agencyId,
        siteSlug: site.slug,
        pageSlug: `inspiration/${slug}`,
        contentId: inspiration.id,
        contentSlug: slug,
        type: "inspiration",
      });
      indexed = true;
      break;
    }

    if (!indexed) {
      excluded.push({
        type: "inspiration",
        contentId: inspiration.id,
        contentSlug: slug,
        reason: "no-canonical-agency",
      });
    }
  }

  const deduplicated = [
    ...new Map(
      entries.map((entry) => [cleanText(entry.url), entry])
    ).values(),
  ].sort((left, right) => left.url.localeCompare(right.url));

  return {
    publicOrigin,
    generatedAt: new Date().toISOString(),
    summary: {
      totalSites: (sites || []).length,
      publishedSites: publishedSites.length,
      destinations: (destinations || []).length,
      indexedDestinationPages: deduplicated.filter((entry) => entry.type === "destination").length,
      editorialContents: (inspirations || []).length,
      indexedEditorialContents: deduplicated.filter((entry) => entry.type === "inspiration").length,
      inspirationIndexPages: deduplicated.filter((entry) => entry.type === "inspiration-index").length,
      entryCount: deduplicated.length,
      excludedCount: excluded.length,
      duplicateCount: entries.length - deduplicated.length,
    },
    entries: deduplicated,
    excluded,
  };
}

module.exports = {
  MANAGED_PAGE_SLUGS,
  NOINDEX_SLUGS,
  PAGE_ALIASES,
  buildPublicSitemap,
  canonicalPageSlug,
  destinationUrl,
  inspirationIndexUrl,
  inspirationUrl,
  isPublishedPage,
  isPublishedSite,
  pageChangeFrequency,
  pagePriority,
  shouldIndexPage,
};