"use strict";

function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function text(value) { if (value == null) return ""; if (typeof value === "string") return value; if (Array.isArray(value)) return value.map(text).join(" "); if (typeof value === "object") return Object.values(value).map(text).join(" "); return String(value); }
function words(value) { return normalize(value).split(/\s+/).filter(Boolean); }
function includesAny(value, terms) { const haystack = ` ${normalize(value)} `; return terms.some((term) => haystack.includes(` ${normalize(term)} `)); }

const SERVICE_TERMS = ["sejour", "sejours", "circuit", "circuits", "croisiere", "croisieres", "billetterie", "vol", "vols", "voyage sur mesure", "sur mesure", "autotour", "autotours", "hotel", "hotels", "club", "clubs"];
const EXPERTISE_TERMS = ["conseil", "conseils", "conseiller", "conseillere", "conseillers", "conseilleres", "expert", "experts", "equipe", "accompagnement", "accompagner", "experience", "specialiste", "specialistes"];
const PROOF_TERMS = ["avis", "clients", "client", "annees d experience", "ans d experience", "depuis", "partenaire", "partenaires", "ambassade", "agence physique", "rendez vous", "sur place"];
const LOCAL_TERMS = ["proximite", "local", "locale", "secteur", "alentours", "voisin", "voisine", "voisines", "depart de", "habitants"];

function auditLocalSemanticDepth(site, { targetCities = [] } = {}) {
  const agency = site?.agency || {};
  const city = String(agency.city || "").trim();
  const publishedPages = (site?.pages || []).filter((page) => page?.published === true || String(page?.status || "").toLowerCase() === "published");
  const corpus = publishedPages.map((page) => `${page.seoTitle || ""} ${page.metaDescription || ""} ${page.title || ""} ${(page.blocks || []).map((block) => text(block?.content)).join(" ")}`).join(" ");
  const wordCount = words(corpus).length;
  const nearbyCities = (targetCities || []).filter((target) => normalize(target) && normalize(target) !== normalize(city));
  const dimensions = {
    locality: Boolean(city && includesAny(corpus, [city])),
    services: includesAny(corpus, SERVICE_TERMS),
    expertise: includesAny(corpus, EXPERTISE_TERMS),
    proof: includesAny(corpus, PROOF_TERMS),
    localContext: includesAny(corpus, LOCAL_TERMS) || nearbyCities.some((target) => includesAny(corpus, [target])),
  };
  const coveredDimensions = Object.values(dimensions).filter(Boolean).length;
  const gaps = [];
  if (wordCount < 120) gaps.push({ code: "local-semantic-content-thin", severity: wordCount < 60 ? "high" : "medium", message: `Le corpus local publié reste trop court (${wordCount} mots) pour démontrer une expertise locale solide.` });
  if (!dimensions.services) gaps.push({ code: "local-semantic-services-missing", severity: "high", message: "Les services réellement proposés par l’agence ne sont pas explicités dans les contenus publiés." });
  if (!dimensions.expertise) gaps.push({ code: "local-semantic-expertise-missing", severity: "medium", message: "Le contenu ne démontre pas suffisamment l’expertise et l’accompagnement de l’équipe locale." });
  if (!dimensions.proof) gaps.push({ code: "local-semantic-proof-missing", severity: "medium", message: "Le contenu manque de preuves locales ou commerciales concrètes : expérience, clients, partenaires, avis ou présence physique." });
  if (!dimensions.localContext) gaps.push({ code: "local-semantic-context-missing", severity: "medium", message: "Le contenu cite la ville mais ne décrit pas suffisamment son ancrage local, son secteur ou les communes desservies." });
  return { wordCount, dimensions, coveredDimensions, dimensionCount: 5, depthScore: Math.round((coveredDimensions / 5) * 100), status: coveredDimensions >= 5 && wordCount >= 120 ? "deep" : coveredDimensions >= 3 ? "partial" : "shallow", gaps };
}

module.exports = { auditLocalSemanticDepth, SERVICE_TERMS, EXPERTISE_TERMS, PROOF_TERMS, LOCAL_TERMS };
