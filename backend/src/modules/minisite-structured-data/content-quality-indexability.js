"use strict";

const CRITICAL_PAGE_MIN_WORDS = 60;
const FUNCTIONAL_BLOCK_SIGNALS = Object.freeze([
  "agency",
  "appointment",
  "contact",
  "destination",
  "faq",
  "feature",
  "gallery",
  "hours",
  "map",
  "offer",
  "review",
  "service",
  "team",
  "testimonial",
]);

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return clean(String(value || "").replace(/<[^>]*>/g, " "));
}

function collectText(value, output = []) {
  if (value == null) return output;
  if (typeof value === "string") {
    const text = stripHtml(value);
    if (text) output.push(text);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, output));
    return output;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (/^(id|imageAssetId|imageUrl|url|href|slug|status|type|blockType)$/i.test(key)) continue;
      collectText(child, output);
    }
  }
  return output;
}

function pageBlocks(page) {
  if (Array.isArray(page?.blocks)) return page.blocks;
  if (Array.isArray(page?.sections)) return page.sections;
  return [];
}

function blockType(block) {
  return clean(block?.blockType || block?.type || block?.kind).toLowerCase();
}

function hasFunctionalBlock(page) {
  return pageBlocks(page).some((block) => {
    const type = blockType(block);
    return Boolean(type) && FUNCTIONAL_BLOCK_SIGNALS.some((signal) => type.includes(signal));
  });
}

function wordCount(page) {
  const text = collectText(pageBlocks(page)).join(" ");
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function assessCriticalContentQuality(page) {
  const words = wordCount(page);
  const functional = hasFunctionalBlock(page);
  return {
    words,
    functional,
    criticallyThin: words < CRITICAL_PAGE_MIN_WORDS && !functional,
  };
}

function canonicalSlug(value) {
  const slug = clean(value).toLowerCase();
  if (["home", "accueil", "index"].includes(slug)) return "";
  return slug;
}

function pageForEntry(entry, sites = []) {
  const site = (sites || []).find((candidate) => String(candidate?.slug || "") === String(entry?.siteSlug || ""));
  if (!site) return null;
  const target = canonicalSlug(entry?.pageSlug);
  return (site.pages || []).find((page) => canonicalSlug(page?.slug) === target) || null;
}

function applyContentQualityIndexabilityContract(sitemap, sites = []) {
  if (!sitemap || !Array.isArray(sitemap.entries)) return sitemap;

  const removed = [];
  const entries = sitemap.entries.filter((entry) => {
    if (entry?.type === "destination" || entry?.type === "inspiration" || entry?.type === "inspiration-index") return true;
    const page = pageForEntry(entry, sites);
    if (!page) return true;
    const quality = assessCriticalContentQuality(page);
    if (!quality.criticallyThin) return true;
    removed.push({ entry, quality });
    return false;
  });

  if (!removed.length) return sitemap;

  const excluded = [
    ...(Array.isArray(sitemap.excluded) ? sitemap.excluded : []),
    ...removed.map(({ entry, quality }) => ({
      type: entry.type || "page",
      siteSlug: entry.siteSlug,
      agencyId: entry.agencyId,
      pageSlug: entry.pageSlug,
      reason: "critically-thin-content",
      words: quality.words,
      functionalBlock: quality.functional,
    })),
  ];

  return {
    ...sitemap,
    entries,
    excluded,
    summary: {
      ...(sitemap.summary || {}),
      criticallyThinExcludedCount: removed.length,
      entryCount: entries.length,
      excludedCount: excluded.length,
    },
  };
}

module.exports = {
  CRITICAL_PAGE_MIN_WORDS,
  FUNCTIONAL_BLOCK_SIGNALS,
  applyContentQualityIndexabilityContract,
  assessCriticalContentQuality,
  blockType,
  collectText,
  hasFunctionalBlock,
  pageBlocks,
  pageForEntry,
  wordCount,
};