"use strict";

const { INTENTS } = require("./local-search-intent-coverage");

function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function text(value) { if (value == null) return ""; if (typeof value === "string") return value; if (Array.isArray(value)) return value.map(text).join(" "); if (typeof value === "object") return Object.values(value).map(text).join(" "); return String(value); }
function hasAny(corpus, terms) { const haystack = ` ${normalize(corpus)} `; return terms.some((term) => haystack.includes(` ${normalize(term)} `)); }
function publishedPages(site) { return (site?.pages || []).filter((page) => page?.published === true || String(page?.status || "").toLowerCase() === "published"); }
function pageCorpus(page) { return `${page?.seoTitle || ""} ${page?.metaDescription || ""} ${page?.title || ""} ${(page?.blocks || []).map((block) => text(block?.content)).join(" ")}`; }

function auditLocalIntentTargetMapping(site) {
  const city = String(site?.agency?.city || "").trim();
  const pages = publishedPages(site).map((page) => ({ slug: String(page?.slug || "").trim() || "accueil", title: page?.title || page?.seoTitle || null, corpus: pageCorpus(page) }));
  const networkCorpus = pages.map((page) => page.corpus).join(" ");
  const cityAnywhere = Boolean(city && hasAny(networkCorpus, [city]));
  const intents = INTENTS.map((intent) => {
    const serviceAnywhere = hasAny(networkCorpus, intent.terms);
    const targets = pages.filter((page) => city && hasAny(page.corpus, [city]) && hasAny(page.corpus, intent.terms)).map((page) => ({ slug: page.slug, title: page.title }));
    const mapped = targets.length > 0;
    return { key: intent.key, label: intent.label, weight: intent.weight, mapped, diffuse: !mapped && cityAnywhere && serviceAnywhere, targets };
  });
  const mappedWeight = intents.reduce((sum, intent) => sum + (intent.mapped ? intent.weight : 0), 0);
  const mappedCount = intents.filter((intent) => intent.mapped).length;
  const diffuseIntents = intents.filter((intent) => intent.diffuse).map((intent) => intent.key);
  const unmappedIntents = intents.filter((intent) => !intent.mapped).map((intent) => intent.key);
  const core = intents.find((intent) => intent.key === "agency") || null;
  const gaps = intents.filter((intent) => !intent.mapped).map((intent) => ({
    code: intent.diffuse ? `local-intent-${intent.key}-diffuse` : `local-intent-${intent.key}-target-missing`,
    severity: intent.key === "agency" ? "high" : intent.weight >= 15 ? "medium" : "low",
    intent: intent.key,
    message: intent.diffuse
      ? `L’intention locale « ${intent.label} à ${city || "la ville cible"} » est dispersée entre plusieurs pages et ne possède pas de cible éditoriale locale claire.`
      : `Aucune page publiée ne couvre clairement sur une même cible l’intention « ${intent.label} » et la ville ${city || "principale"}.`,
  }));
  return {
    city: city || null,
    score: mappedWeight,
    status: mappedWeight >= 80 ? "strong" : mappedWeight >= 55 ? "partial" : "weak",
    mappedIntentCount: mappedCount,
    intentCount: intents.length,
    coreIntentMapped: core?.mapped === true,
    diffuseIntents,
    unmappedIntents,
    intents,
    gaps,
  };
}

module.exports = { auditLocalIntentTargetMapping, pageCorpus, publishedPages };
