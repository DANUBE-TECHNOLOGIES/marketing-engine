"use strict";

const {
  auditLocalIntentTargetQuality,
} = require("../minisite-structured-data/local-intent-target-quality");
const {
  collectLinks,
} = require("./pre-rollout-quality");

const CORE_INTENT = "agency";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function contentText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(contentText).join(" ");
  if (typeof value === "object") return Object.values(value).map(contentText).join(" ");
  return String(value);
}

function wordCountForPage(page = {}) {
  const text = (page.blocks || [])
    .map((block) => contentText(block?.content))
    .join(" ");
  return normalize(text).split(/\s+/).filter(Boolean).length;
}

function publishedPages(site = {}) {
  return (site.pages || []).filter(
    (page) =>
      page?.published === true ||
      String(page?.status || "").toLowerCase() === "published"
  );
}

function missingSignals(target = {}) {
  const missing = [];
  if (!target.titleQualified) missing.push("title");
  if (!target.metaQualified) missing.push("meta");
  if (!target.h1Qualified) missing.push("h1");
  if (!target.bodyQualified) missing.push("body");
  if (!target.sufficientDepth) missing.push("depth");
  return missing;
}

function intentOpportunities(site = {}) {
  const quality = auditLocalIntentTargetQuality(site);
  return (quality.intents || [])
    .filter(
      (intent) =>
        intent.key !== CORE_INTENT &&
        intent.mapped === true &&
        intent.bestTarget &&
        intent.qualityStatus !== "strong"
    )
    .map((intent) => ({
      kind: "intent-quality",
      intent: intent.key,
      label: intent.label,
      severity: intent.qualityStatus === "weak" ? "medium" : "low",
      pageSlug: intent.bestTarget.slug,
      currentScore: intent.qualityScore,
      currentStatus: intent.qualityStatus,
      missingSignals: missingSignals(intent.bestTarget),
      targetScore: 80,
      targetStatus: "strong",
    }));
}

function thinContentOpportunities(site = {}, { minimumWords = 120 } = {}) {
  return publishedPages(site)
    .map((page) => ({ page, wordCount: wordCountForPage(page) }))
    .filter(({ wordCount }) => wordCount < minimumWords)
    .map(({ page, wordCount }) => ({
      kind: "thin-content",
      pageSlug: String(page.slug || "").trim() || "home",
      severity: "medium",
      wordCount,
      minimumWords,
      missingWords: Math.max(0, minimumWords - wordCount),
    }));
}

function canonicalPath(siteSlug, page = {}) {
  const root = `/agence/${String(siteSlug || "").trim()}`;
  const slug = String(page.slug || "").trim();
  return !slug || ["home", "accueil"].includes(normalize(slug))
    ? root
    : `${root}/${slug}`;
}

function internalLinkOpportunities(site = {}) {
  const pages = publishedPages(site);
  const rows = pages.map((page) => ({
    page,
    pageSlug: String(page.slug || "").trim() || "home",
    path: canonicalPath(site.slug, page),
    links: collectLinks(page.blocks || []).map((href) => String(href).split(/[?#]/)[0]),
  }));
  const incoming = new Map(rows.map((row) => [row.path, 0]));

  for (const row of rows) {
    for (const href of row.links) {
      if (incoming.has(href)) incoming.set(href, incoming.get(href) + 1);
    }
  }

  return rows
    .filter((row) => !["home", "accueil"].includes(normalize(row.pageSlug)))
    .filter((row) => (incoming.get(row.path) || 0) === 0)
    .map((row) => ({
      kind: "internal-link",
      severity: "medium",
      pageSlug: row.pageSlug,
      path: row.path,
      incomingEditorialLinks: 0,
      suggestedSourceSlugs: rows
        .filter((candidate) => candidate.pageSlug !== row.pageSlug)
        .sort((left, right) => {
          const leftHome = ["home", "accueil"].includes(normalize(left.pageSlug)) ? 0 : 1;
          const rightHome = ["home", "accueil"].includes(normalize(right.pageSlug)) ? 0 : 1;
          if (leftHome !== rightHome) return leftHome - rightHome;
          return left.pageSlug.localeCompare(right.pageSlug, "fr");
        })
        .slice(0, 3)
        .map((candidate) => candidate.pageSlug),
    }));
}

function buildLocalSeoQualityUpliftPlan(
  site = {},
  { minimumWords = 120 } = {}
) {
  const intent = intentOpportunities(site);
  const thin = thinContentOpportunities(site, { minimumWords });
  const links = internalLinkOpportunities(site);

  return {
    version: "mse-25.31",
    siteSlug: site.slug || null,
    agencyId: site.agencyId || site.agency?.id || null,
    city: site.agency?.city || null,
    readOnly: true,
    summary: {
      intentOpportunityCount: intent.length,
      thinContentOpportunityCount: thin.length,
      internalLinkOpportunityCount: links.length,
      totalOpportunityCount: intent.length + thin.length + links.length,
    },
    intentOpportunities: intent,
    thinContentOpportunities: thin,
    internalLinkOpportunities: links,
  };
}

module.exports = {
  buildLocalSeoQualityUpliftPlan,
  canonicalPath,
  contentText,
  intentOpportunities,
  internalLinkOpportunities,
  missingSignals,
  thinContentOpportunities,
  wordCountForPage,
};
