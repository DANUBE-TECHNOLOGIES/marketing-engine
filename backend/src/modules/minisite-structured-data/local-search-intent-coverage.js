"use strict";

function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function text(value) { if (value == null) return ""; if (typeof value === "string") return value; if (Array.isArray(value)) return value.map(text).join(" "); if (typeof value === "object") return Object.values(value).map(text).join(" "); return String(value); }
function hasAny(corpus, terms) { const haystack = ` ${normalize(corpus)} `; return terms.some((term) => haystack.includes(` ${normalize(term)} `)); }

const INTENTS = Object.freeze([
  { key: "agency", label: "Agence de voyages", weight: 25, terms: ["agence de voyage", "agence de voyages", "agence voyage", "agence voyages"] },
  { key: "advice", label: "Conseil et accompagnement", weight: 15, terms: ["conseil voyage", "conseils voyage", "conseiller voyage", "conseillere voyage", "accompagnement"] },
  { key: "custom", label: "Voyage sur mesure", weight: 15, terms: ["voyage sur mesure", "sejour sur mesure", "circuit sur mesure", "sur mesure"] },
  { key: "package", label: "Séjours et circuits", weight: 15, terms: ["sejour", "sejours", "circuit", "circuits", "club", "clubs"] },
  { key: "cruise", label: "Croisières", weight: 10, terms: ["croisiere", "croisieres"] },
  { key: "ticketing", label: "Billetterie et vols", weight: 10, terms: ["billetterie", "billet avion", "billets avion", "vol", "vols"] },
  { key: "appointment", label: "Contact / rendez-vous", weight: 10, terms: ["rendez vous", "contactez", "contact", "telephone", "appelez", "agence physique"] },
]);

function auditLocalSearchIntentCoverage(site) {
  const city = String(site?.agency?.city || "").trim();
  const pages = (site?.pages || []).filter((page) => page?.published === true || String(page?.status || "").toLowerCase() === "published");
  const corpus = pages.map((page) => `${page.seoTitle || ""} ${page.metaDescription || ""} ${page.title || ""} ${(page.blocks || []).map((block) => text(block?.content)).join(" ")}`).join(" ");
  const localityPresent = Boolean(city && hasAny(corpus, [city]));
  const intents = INTENTS.map((intent) => ({ ...intent, covered: hasAny(corpus, intent.terms), localQualified: localityPresent && hasAny(corpus, intent.terms) }));
  const score = intents.reduce((sum, intent) => sum + (intent.localQualified ? intent.weight : 0), 0);
  const gaps = intents.filter((intent) => !intent.localQualified).map((intent) => ({ code: `local-intent-${intent.key}-missing`, severity: intent.weight >= 20 ? "high" : intent.weight >= 15 ? "medium" : "low", intent: intent.key, message: city ? `L’intention locale « ${intent.label} à ${city} » n’est pas suffisamment couverte par le contenu publié.` : `L’intention « ${intent.label} » ne peut pas être qualifiée localement sans ville principale.` }));
  return { city: city || null, localityPresent, score, status: score >= 80 ? "strong" : score >= 55 ? "partial" : "weak", coveredIntentCount: intents.filter((intent) => intent.localQualified).length, intentCount: intents.length, intents, gaps };
}

module.exports = { auditLocalSearchIntentCoverage, INTENTS };
