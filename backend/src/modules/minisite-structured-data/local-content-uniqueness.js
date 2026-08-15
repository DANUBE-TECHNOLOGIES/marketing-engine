"use strict";

const { contentText, normalizeText } = require("./local-seo-coverage");

function homepageForSite(site) {
  const pages = (site?.pages || []).filter((page) => page?.published === true || String(page?.status || "").toLowerCase() === "published");
  return pages.find((page) => ["", "/", "accueil", "home"].includes(String(page?.slug || "").toLowerCase())) || pages[0] || null;
}

function pageCorpus(page) {
  if (!page) return "";
  const blocks = (page.blocks || []).map((block) => contentText(block?.content)).join(" ");
  return normalizeText(`${page.seoTitle || page.title || ""} ${page.metaDescription || ""} ${blocks}`);
}

function shingles(text, size = 3) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let index = 0; index <= words.length - size; index += 1) set.add(words.slice(index, index + size).join(" "));
  return set;
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

function auditLocalContentUniqueness(sites, { threshold = 0.78, minimumWords = 80 } = {}) {
  const prepared = (sites || []).map((site) => {
    const page = homepageForSite(site);
    const corpus = pageCorpus(page);
    return {
      siteSlug: site?.slug || null,
      agencyName: site?.agency?.name || null,
      city: site?.agency?.city || null,
      pageSlug: page?.slug || null,
      corpus,
      wordCount: corpus ? corpus.split(/\s+/).filter(Boolean).length : 0,
      shingles: shingles(corpus),
    };
  });

  const pairs = [];
  for (let leftIndex = 0; leftIndex < prepared.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < prepared.length; rightIndex += 1) {
      const left = prepared[leftIndex];
      const right = prepared[rightIndex];
      if (left.wordCount < minimumWords || right.wordCount < minimumWords) continue;
      const similarity = jaccard(left.shingles, right.shingles);
      if (similarity < threshold) continue;
      pairs.push({
        leftSiteSlug: left.siteSlug,
        rightSiteSlug: right.siteSlug,
        leftAgencyName: left.agencyName,
        rightAgencyName: right.agencyName,
        similarity: Number(similarity.toFixed(3)),
        severity: similarity >= 0.9 ? "critical" : similarity >= 0.84 ? "high" : "medium",
      });
    }
  }

  const items = prepared.map((item) => {
    const matches = pairs.filter((pair) => pair.leftSiteSlug === item.siteSlug || pair.rightSiteSlug === item.siteSlug);
    const strongest = matches.reduce((max, pair) => Math.max(max, pair.similarity), 0);
    const score = item.wordCount < minimumWords ? 70 : Math.max(0, Math.round(100 - strongest * 100));
    return {
      siteSlug: item.siteSlug,
      agencyName: item.agencyName,
      city: item.city,
      homepageWordCount: item.wordCount,
      score,
      status: matches.some((pair) => pair.severity === "critical" || pair.severity === "high") ? "duplicate-risk" : matches.length ? "review" : "unique",
      duplicatePairCount: matches.length,
      strongestSimilarity: Number(strongest.toFixed(3)),
      matches,
    };
  });

  return {
    version: "mse-25.25",
    threshold,
    minimumWords,
    summary: {
      siteCount: items.length,
      uniqueSites: items.filter((item) => item.status === "unique").length,
      reviewSites: items.filter((item) => item.status === "review").length,
      duplicateRiskSites: items.filter((item) => item.status === "duplicate-risk").length,
      duplicatePairCount: pairs.length,
    },
    sites: items,
    pairs,
  };
}

module.exports = { homepageForSite, pageCorpus, shingles, jaccard, auditLocalContentUniqueness };
