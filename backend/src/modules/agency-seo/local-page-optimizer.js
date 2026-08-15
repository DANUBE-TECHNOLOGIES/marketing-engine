"use strict";

function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function clamp(value, max) { const text = clean(value); if (text.length <= max) return text; return `${text.slice(0, Math.max(0, max - 1)).replace(/[\s,;:.-]+$/g, "")}…`; }
function agencyName(site) { return clean(site?.agency?.name || site?.name || "Mondescale Voyages"); }
function cityName(site, page) { return clean(page?.localCity || site?.seoCity || site?.agency?.city); }
function intentFor(page) {
  const type = clean(page?.pageType).toLowerCase();
  const title = clean(page?.title).toLowerCase();
  if (/croisi/.test(type + title)) return { noun: "Croisières", service: "croisières" };
  if (/circuit/.test(type + title)) return { noun: "Circuits", service: "circuits" };
  if (/sur.?mesure|custom/.test(type + title)) return { noun: "Voyages sur mesure", service: "voyages sur mesure" };
  if (/billet|vol|flight/.test(type + title)) return { noun: "Billetterie et vols", service: "billetterie et vols" };
  if (/sejour|séjour|club/.test(type + title)) return { noun: "Séjours", service: "séjours" };
  return { noun: "Agence de voyages", service: "voyages" };
}

function buildLocalPageOptimization(site, page) {
  const city = cityName(site, page); const brand = agencyName(site); const intent = intentFor(page);
  if (!city) throw new Error("LOCAL_SEO_OPTIMIZER_CITY_REQUIRED");
  const homepage = ["", "/", "accueil", "home"].includes(clean(page?.slug).toLowerCase()) || clean(page?.pageType).toLowerCase() === "home";
  const seoTitle = clamp(homepage ? `Agence de voyages à ${city} | ${brand}` : `${intent.noun} à ${city} | ${brand}`, 60);
  const h1 = homepage ? `Votre agence de voyages à ${city}` : `${intent.noun} à ${city} avec nos conseillers voyages`;
  const seoDescription = clamp(homepage ? `Préparez votre prochain voyage avec ${brand} à ${city} : conseils personnalisés, séjours, circuits, croisières et voyages sur mesure.` : `Découvrez nos ${intent.service} au départ de ${city}. ${brand} vous conseille et construit avec vous un projet adapté à vos envies et à votre budget.`, 160);
  const introduction = homepage ? `${brand} vous accueille à ${city} pour concevoir vos vacances avec un conseiller voyage. Notre équipe vous accompagne pour vos séjours, circuits, croisières, billets d’avion et voyages sur mesure, avec un conseil humain avant, pendant et après votre réservation.` : `Vous recherchez ${intent.service} à ${city} ? L’équipe ${brand} vous accompagne dans le choix et la préparation de votre projet. Nous comparons les solutions adaptées à vos envies, à votre budget et à vos dates, puis restons disponibles jusqu’à votre retour.`;
  return { seoTitle, seoDescription, h1, introduction, localCity: city, optimization: { version: "mse-25.30", mode: "deterministic-draft", intent: intent.service, homepage, requiresHumanReview: true, autoPublish: false } };
}

function buildOptimizationPatch(page, proposal) {
  const content = page?.content && typeof page.content === "object" && !Array.isArray(page.content) ? { ...page.content } : {};
  return { seoTitle: proposal.seoTitle, seoDescription: proposal.seoDescription, introduction: proposal.introduction, localCity: proposal.localCity, content: { ...content, h1: proposal.h1, seoOptimization: proposal.optimization } };
}

module.exports = { buildLocalPageOptimization, buildOptimizationPatch, intentFor };
