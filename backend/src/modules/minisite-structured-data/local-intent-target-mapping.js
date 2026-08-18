"use strict";

const { INTENTS } = require("./local-search-intent-coverage");

function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function text(value) { if (value == null) return ""; if (typeof value === "string") return value; if (Array.isArray(value)) return value.map(text).join(" "); if (typeof value === "object") return Object.values(value).map(text).join(" "); return String(value); }
function hasAny(corpus, terms) { const haystack = ` ${normalize(corpus)} `; return terms.some((term) => haystack.includes(` ${normalize(term)} `)); }
function words(value) { return normalize(value).split(/\s+/).filter((word) => word.length > 1).length; }
function publishedPages(site) { return (site?.pages || []).filter((page) => page?.published === true || String(page?.status || "").toLowerCase() === "published"); }
function pageBody(page) { return (page?.blocks || []).map((block) => text(block?.content)).join(" "); }
function pageCorpus(page) { return `${page?.seoTitle || ""} ${page?.metaDescription || ""} ${page?.title || ""} ${pageBody(page)}`; }

function targetQuality(page, city, intent) {
  const title = `${page?.seoTitle || ""} ${page?.title || ""}`;
  const body = pageBody(page);
  const titleHasCity = Boolean(city && hasAny(title, [city]));
  const titleHasIntent = hasAny(title, intent.terms);
  const bodyHasCity = Boolean(city && hasAny(body, [city]));
  const bodyHasIntent = hasAny(body, intent.terms);
  const bodyWordCount = words(body);

  let score = 0;
  if (titleHasCity) score += 25;
  if (titleHasIntent) score += 25;
  if (bodyHasCity) score += 15;
  if (bodyHasIntent) score += 20;
  if (bodyWordCount >= 80) score += 15;

  const missingSignals = [];
  if (!titleHasCity) missingSignals.push("locality-in-title");
  if (!titleHasIntent) missingSignals.push("intent-in-title");
  if (!bodyHasCity) missingSignals.push("locality-in-body");
  if (!bodyHasIntent) missingSignals.push("intent-in-body");
  if (bodyWordCount < 80) missingSignals.push("editorial-depth");

  return {
    score,
    status: score >= 80 ? "strong" : score >= 60 ? "improvable" : "weak",
    bodyWordCount,
    signals: { titleHasCity, titleHasIntent, bodyHasCity, bodyHasIntent },
    missingSignals,
  };
}

function auditLocalIntentTargetMapping(site) {
  const city = String(site?.agency?.city || "").trim();
  const sourcePages = publishedPages(site);
  const pages = sourcePages.map((page) => ({ slug: String(page?.slug || "").trim() || "accueil", title: page?.title || page?.seoTitle || null, corpus: pageCorpus(page), source: page }));
  const networkCorpus = pages.map((page) => page.corpus).join(" ");
  const cityAnywhere = Boolean(city && hasAny(networkCorpus, [city]));
  const intents = INTENTS.map((intent) => {
    const serviceAnywhere = hasAny(networkCorpus, intent.terms);
    const targets = pages
      .filter((page) => city && hasAny(page.corpus, [city]) && hasAny(page.corpus, intent.terms))
      .map((page) => ({ slug: page.slug, title: page.title, quality: targetQuality(page.source, city, intent) }))
      .sort((left, right) => right.quality.score - left.quality.score || left.slug.localeCompare(right.slug, "fr"));
    const mapped = targets.length > 0;
    return {
      key: intent.key,
      label: intent.label,
      weight: intent.weight,
      mapped,
      diffuse: !mapped && cityAnywhere && serviceAnywhere,
      targets,
      bestTarget: targets[0] || null,
      targetQualityScore: targets[0]?.quality?.score || 0,
      targetQualityStatus: targets[0]?.quality?.status || "missing",
    };
  });
  const mappedWeight = intents.reduce((sum, intent) => sum + (intent.mapped ? intent.weight : 0), 0);
  const mappedCount = intents.filter((intent) => intent.mapped).length;
  const diffuseIntents = intents.filter((intent) => intent.diffuse).map((intent) => intent.key);
  const unmappedIntents = intents.filter((intent) => !intent.mapped).map((intent) => intent.key);
  const weakSecondaryTargets = intents.filter((intent) => intent.key !== "agency" && intent.mapped && intent.targetQualityScore < 60);
  const improvableSecondaryTargets = intents.filter((intent) => intent.key !== "agency" && intent.mapped && intent.targetQualityScore >= 60 && intent.targetQualityScore < 80);
  const core = intents.find((intent) => intent.key === "agency") || null;
  const gaps = [
    ...intents.filter((intent) => !intent.mapped).map((intent) => ({
      code: intent.diffuse ? `local-intent-${intent.key}-diffuse` : `local-intent-${intent.key}-target-missing`,
      severity: intent.key === "agency" ? "high" : intent.weight >= 15 ? "medium" : "low",
      intent: intent.key,
      message: intent.diffuse
        ? `L’intention locale « ${intent.label} à ${city || "la ville cible"} » est dispersée entre plusieurs pages et ne possède pas de cible éditoriale locale claire.`
        : `Aucune page publiée ne couvre clairement sur une même cible l’intention « ${intent.label} » et la ville ${city || "principale"}.`,
    })),
    ...intents.filter((intent) => intent.key !== "agency" && intent.mapped && intent.targetQualityScore < 80).map((intent) => ({
      code: "local-secondary-intent-target-quality-weak",
      severity: intent.targetQualityScore < 60 ? "medium" : "low",
      intent: intent.key,
      targetSlug: intent.bestTarget?.slug || null,
      targetQualityScore: intent.targetQualityScore,
      missingSignals: intent.bestTarget?.quality?.missingSignals || [],
      message: `La meilleure cible locale « ${intent.bestTarget?.title || intent.bestTarget?.slug || "page publiée"} » pour l’intention « ${intent.label} » reste à renforcer (${intent.targetQualityScore}/100).`,
    })),
  ];
  return {
    city: city || null,
    score: mappedWeight,
    status: mappedWeight >= 80 ? "strong" : mappedWeight >= 55 ? "partial" : "weak",
    mappedIntentCount: mappedCount,
    intentCount: intents.length,
    coreIntentMapped: core?.mapped === true,
    diffuseIntents,
    unmappedIntents,
    weakSecondaryTargets: weakSecondaryTargets.map((intent) => intent.key),
    improvableSecondaryTargets: improvableSecondaryTargets.map((intent) => intent.key),
    strongSecondaryTargetCount: intents.filter((intent) => intent.key !== "agency" && intent.mapped && intent.targetQualityScore >= 80).length,
    intents,
    gaps,
  };
}

module.exports = { auditLocalIntentTargetMapping, pageCorpus, publishedPages, targetQuality };
