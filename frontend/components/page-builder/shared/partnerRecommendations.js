"use strict";

import { getCommonPartners } from "./commonPartners";
import { FULL_PARTNERS } from "./fullPartners";
import { getPartnerProfile } from "./partnerProfile";
import { partnerKey } from "./partnerSelection";

const INTENT_RULES = Object.freeze([
  { category: "croisieres", terms: ["croisiere", "croisieres", "fluvial", "navire", "bateau", "mediterranee", "expedition"] },
  { category: "circuits", terms: ["circuit", "circuits", "autotour", "itineraire", "accompagne", "aventure", "randonnée", "randonnee", "culture"] },
  { category: "sejours", terms: ["sejour", "sejours", "club", "clubs", "balneaire", "soleil", "famille", "tout compris", "hotel"] },
  { category: "sur-mesure", terms: ["sur mesure", "long courrier", "long-courrier", "combiné", "combine", "lune de miel", "noces", "premium", "luxe"] },
  { category: "france-europe", terms: ["france", "europe", "montagne", "camping", "residence", "résidence", "thalasso", "bien etre", "bien-être", "corse"] },
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

function networkKeys(items = getCommonPartners()) {
  const keys = new Set();
  for (const item of items) {
    for (const candidate of [item?.id, item?.name, item?.title]) {
      const key = partnerKey(candidate);
      if (key) keys.add(key);
    }
    for (const child of Array.isArray(item?.children) ? item.children : []) {
      for (const candidate of [child?.id, child?.name, child?.title]) {
        const key = partnerKey(candidate);
        if (key) keys.add(key);
      }
    }
  }
  return keys;
}

export function buildPartnerRecommendationSignals(site, activePage) {
  const values = [];
  if (site?.name) values.push(site.name);
  for (const page of Array.isArray(site?.pages) ? site.pages : []) {
    values.push(page?.title, page?.seoTitle, page?.seoDescription);
  }
  if (activePage) {
    values.push(activePage.title, activePage.seoTitle, activePage.seoDescription);
    for (const block of Array.isArray(activePage.blocks) ? activePage.blocks : []) {
      if (block?.type === "partner-logos") continue;
      try { values.push(JSON.stringify(block?.content || {})); } catch { /* ignore non-serializable content */ }
    }
  }
  return values.map(normalize).filter(Boolean);
}

export function recommendAgencyPartners({ signals = [], selected = [], networkItems = getCommonPartners(), max = 3 } = {}) {
  const haystack = normalize((Array.isArray(signals) ? signals : [signals]).join(" "));
  if (!haystack) return [];

  const categoryScores = new Map();
  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const term of rule.terms) {
      const normalizedTerm = normalize(term);
      if (normalizedTerm && haystack.includes(normalizedTerm)) score += 1;
    }
    if (score > 0) categoryScores.set(rule.category, score);
  }
  if (!categoryScores.size) return [];

  const reserved = networkKeys(networkItems);
  const alreadySelected = new Set((Array.isArray(selected) ? selected : []).flatMap((item) => [partnerKey(item?.catalogPartnerId || item?.id), partnerKey(item?.name)]).filter(Boolean));

  const ranked = FULL_PARTNERS
    .map(getPartnerProfile)
    .filter((partner) => partner?.publishable && partner?.readyForPublication)
    .filter((partner) => !reserved.has(partnerKey(partner.id)) && !reserved.has(partnerKey(partner.name)))
    .filter((partner) => !alreadySelected.has(partnerKey(partner.id)) && !alreadySelected.has(partnerKey(partner.name)))
    .map((partner) => {
      const categoryScore = categoryScores.get(partner.category) || 0;
      const detailText = normalize([
        partner.summary,
        ...(partner.tags || []),
        ...(partner.details?.destinations || []),
        ...(partner.details?.travelTypes || []),
        ...(partner.details?.brands || []),
      ].join(" "));
      let lexicalScore = 0;
      for (const token of new Set(haystack.split(" ").filter((token) => token.length >= 5))) {
        if (detailText.includes(token)) lexicalScore += 1;
      }
      const score = categoryScore * 100 + Math.min(25, lexicalScore) + (partner.hasLogo ? 2 : 0);
      return {
        partner,
        score,
        reason: categoryScore > 0 ? `Affinité ${partner.category.replace("sur-mesure", "sur mesure").replace("france-europe", "France/Europe")}` : "Affinité éditoriale",
      };
    })
    .filter((entry) => entry.score >= 100)
    .sort((a, b) => b.score - a.score || a.partner.name.localeCompare(b.partner.name, "fr"));

  const limit = Math.max(0, Math.min(3, Number(max) || 3));
  const selectedRecommendations = [];
  const usedCategories = new Set();

  for (const entry of ranked) {
    if (selectedRecommendations.length >= limit) break;
    if (!usedCategories.has(entry.partner.category)) {
      selectedRecommendations.push(entry);
      usedCategories.add(entry.partner.category);
    }
  }
  for (const entry of ranked) {
    if (selectedRecommendations.length >= limit) break;
    if (!selectedRecommendations.some((candidate) => candidate.partner.id === entry.partner.id)) selectedRecommendations.push(entry);
  }

  return selectedRecommendations;
}
