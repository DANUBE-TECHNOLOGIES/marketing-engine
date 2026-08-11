"use strict";

const { isPublished } = require("./service");
const { textValues } = require("./prepublication-readiness");

const STOP_WORDS = new Set([
  "a", "au", "aux", "avec", "de", "des", "du", "en", "et", "la", "le", "les",
  "pour", "sur", "un", "une", "voyage", "voyages", "agence", "agences",
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordTerms(keyword, city) {
  const cityTerms = new Set(normalize(city).split(" ").filter(Boolean));
  return normalize(keyword)
    .split(" ")
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term) && !cityTerms.has(term));
}

function pageText(page) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const sections = Array.isArray(page?.sections) ? page.sections : [];
  const source = blocks.length > 0 ? blocks : sections;
  const entries = source.filter(
    (entry) => String(entry?.status || "").toLowerCase() !== "hidden" && isPublished(entry)
  );

  return textValues([
    page?.title,
    page?.h1,
    page?.seoTitle,
    page?.metaDescription,
    ...entries.map((entry) => entry.content ?? entry.jsonContent ?? {}),
  ]).join(" ");
}

function scorePageForKeyword(page, keyword, city) {
  const terms = keywordTerms(keyword, city);
  if (!terms.length) return null;

  const title = normalize([page?.title, page?.h1, page?.seoTitle].filter(Boolean).join(" "));
  const body = normalize(pageText(page));
  const matchedTerms = terms.filter((term) => body.includes(term));
  const titleMatches = terms.filter((term) => title.includes(term));
  const coverage = matchedTerms.length / terms.length;
  const titleCoverage = titleMatches.length / terms.length;
  const score = Math.round((coverage * 0.7 + titleCoverage * 0.3) * 1000) / 1000;

  return {
    pageId: page.id,
    slug: String(page.slug || "").trim() || "home",
    title: page.title || page.h1 || page.seoTitle || "Page sans titre",
    score,
    coverage: Math.round(coverage * 1000) / 1000,
    titleCoverage: Math.round(titleCoverage * 1000) / 1000,
    matchedTerms,
  };
}

function bestPublishedPage(pages, keyword, city) {
  const candidates = (pages || [])
    .filter((page) => isPublished(page))
    .map((page) => scorePageForKeyword(page, keyword, city))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);

  const best = candidates[0] || null;
  return best && best.coverage >= 0.5 ? best : null;
}

function mapRankingOpportunitiesToPages(rankingCheck, pages = []) {
  const opportunities = Array.isArray(rankingCheck?.opportunities)
    ? rankingCheck.opportunities
    : [];

  return opportunities.map((opportunity) => {
    const targetPage = bestPublishedPage(pages, opportunity.keyword, opportunity.city);
    return {
      ...opportunity,
      targetPage,
      coverageStatus: targetPage ? "covered" : "unmapped",
      action: targetPage
        ? `Renforcer en priorité la page publiée « ${targetPage.title} » (${targetPage.slug}) pour cette intention : améliorer le contenu local utile et son maillage interne avant toute création de nouvelle page.`
        : "Aucune page publiée ne couvre clairement cette intention. Vérifier d'abord qu'elle correspond réellement à l'activité de l'agence, puis décider s'il faut enrichir une page existante plutôt que créer automatiquement une nouvelle page.",
    };
  });
}

function applyRankingContentCoverage(report, pages = []) {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const ranking = checks.find((check) => check?.code === "LOCAL_RANKINGS");
  if (!ranking) return report;

  const opportunities = mapRankingOpportunitiesToPages(ranking, pages);
  const mapped = opportunities.filter((item) => item.coverageStatus === "covered").length;

  return {
    ...report,
    version: "2.4",
    checks: checks.map((check) =>
      check?.code === "LOCAL_RANKINGS"
        ? {
            ...check,
            opportunities,
            mappedOpportunities: mapped,
            unmappedOpportunities: opportunities.length - mapped,
          }
        : check
    ),
  };
}

module.exports = {
  normalize,
  keywordTerms,
  pageText,
  scorePageForKeyword,
  bestPublishedPage,
  mapRankingOpportunitiesToPages,
  applyRankingContentCoverage,
};
