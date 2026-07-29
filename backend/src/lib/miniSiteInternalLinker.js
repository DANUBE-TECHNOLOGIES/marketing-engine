"use strict";

const { buildRecommendations } = require("./miniSiteComposer");

function asArray(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function destinationPath(siteSlug, destinationSlug) { return `/agence/${siteSlug}/destination/${destinationSlug}`; }

function buildPageIndex(pages = []) {
  return new Map(asArray(pages).filter((page) => page?.slug).map((page) => [page.slug, page]));
}

function buildLinkItems({ destination, destinations = [], pages = [], siteSlug, limit = 6 }) {
  const pageIndex = buildPageIndex(pages);
  const candidates = asArray(destinations).filter((item) => item.id !== destination?.id && pageIndex.has(item.slug));
  return buildRecommendations(destination, candidates, limit).map((item) => ({
    title: item.name,
    href: destinationPath(siteSlug, item.slug),
    score: item.score,
    reasons: item.reasons,
  }));
}

function buildInternalLinkPlan({ destinations = [], pages = [], siteSlug, limit = 6 }) {
  const pageIndex = buildPageIndex(pages);
  const destinationIndex = new Map(asArray(destinations).map((item) => [item.slug, item]));
  const items = [];
  for (const page of asArray(pages).filter((item) => item.pageType === "destination" && destinationIndex.has(item.slug))) {
    const destination = destinationIndex.get(page.slug);
    const links = buildLinkItems({ destination, destinations, pages, siteSlug, limit });
    items.push({ pageId: page.id, slug: page.slug, path: page.path, outbound: links.length, links });
  }
  const inbound = new Map(items.map((item) => [item.slug, 0]));
  for (const item of items) {
    for (const link of item.links) {
      const slug = link.href.split("/").filter(Boolean).pop();
      if (inbound.has(slug)) inbound.set(slug, inbound.get(slug) + 1);
    }
  }
  const enriched = items.map((item) => ({ ...item, inbound: inbound.get(item.slug) || 0, orphan: (inbound.get(item.slug) || 0) === 0 }));
  return {
    summary: {
      pages: enriched.length,
      links: enriched.reduce((sum, item) => sum + item.outbound, 0),
      orphans: enriched.filter((item) => item.orphan).length,
      withoutOutboundLinks: enriched.filter((item) => item.outbound === 0).length,
    },
    items: enriched,
  };
}

function buildRecommendationSectionData(links, status = "draft") {
  return {
    sectionType: "destination-recommendations",
    jsonContent: { title: "Vous aimerez aussi", items: asArray(links) },
    displayOrder: 7,
    status,
  };
}

module.exports = { destinationPath, buildPageIndex, buildLinkItems, buildInternalLinkPlan, buildRecommendationSectionData };
