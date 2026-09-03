"use strict";

function cleanUrl(value) {
  return String(value || "").trim().replace(/\/+$/g, "");
}

function inspirationIndexParent(entry) {
  const url = cleanUrl(entry?.url);
  if (!url) return null;
  const marker = "/inspiration/";
  const index = url.lastIndexOf(marker);
  if (index < 0) return null;
  return url.slice(0, index + "/inspiration".length);
}

function discoverySource(entry, entryUrls) {
  if (!entry || !entry.url) return null;

  if (entry.type === "destination") return "destination-block";
  if (entry.type === "inspiration-index") return "footer";

  if (entry.type === "inspiration") {
    const parent = inspirationIndexParent(entry);
    return parent && entryUrls.has(parent) ? "inspiration-index" : null;
  }

  if (!entry.type && String(entry.pageSlug || "") === "") return "site-root";
  if (!entry.type && String(entry.pageSlug || "").trim()) return "navigation";

  return null;
}

function orphanReason(entry, entryUrls) {
  if (entry?.type === "inspiration") {
    const parent = inspirationIndexParent(entry);
    if (!parent || !entryUrls.has(parent)) return "missing-inspiration-index";
  }
  return "unknown-discovery-source";
}

function auditSitemapCrawlability(sitemap) {
  if (!sitemap || !Array.isArray(sitemap.entries)) return sitemap;

  const entryUrls = new Set(sitemap.entries.map((entry) => cleanUrl(entry?.url)).filter(Boolean));
  const sourceCounts = {};
  const orphanEntries = [];

  const entries = sitemap.entries.map((entry) => {
    const source = discoverySource(entry, entryUrls);
    if (source) {
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      return { ...entry, discoverySource: source };
    }

    orphanEntries.push({
      url: entry?.url || null,
      type: entry?.type || "page",
      siteSlug: entry?.siteSlug || null,
      pageSlug: entry?.pageSlug || null,
      reason: orphanReason(entry, entryUrls),
    });
    return { ...entry, discoverySource: null };
  });

  return {
    ...sitemap,
    entries,
    crawlability: {
      orphanEntries,
      sourceCounts,
      orphanedEntryCount: orphanEntries.length,
    },
    summary: {
      ...(sitemap.summary || {}),
      orphanedEntryCount: orphanEntries.length,
      crawlabilitySourceCounts: sourceCounts,
    },
  };
}

module.exports = {
  auditSitemapCrawlability,
  cleanUrl,
  discoverySource,
  inspirationIndexParent,
};
