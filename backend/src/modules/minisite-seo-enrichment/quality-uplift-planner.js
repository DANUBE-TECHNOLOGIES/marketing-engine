"use strict";

const {
  auditLocalIntentTargetQuality,
} = require("../minisite-structured-data/local-intent-target-quality");

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

function buildLocalSeoQualityUpliftPlan(
  site = {},
  { minimumWords = 120 } = {}
) {
  const intent = intentOpportunities(site);
  const thin = thinContentOpportunities(site, { minimumWords });

  return {
    version: "mse-25.31",
    siteSlug: site.slug || null,
    agencyId: site.agencyId || site.agency?.id || null,
    city: site.agency?.city || null,
    readOnly: true,
    summary: {
      intentOpportunityCount: intent.length,
      thinContentOpportunityCount: thin.length,
      totalOpportunityCount: intent.length + thin.length,
    },
    intentOpportunities: intent,
    thinContentOpportunities: thin,
  };
}

module.exports = {
  buildLocalSeoQualityUpliftPlan,
  contentText,
  intentOpportunities,
  missingSignals,
  thinContentOpportunities,
  wordCountForPage,
};
