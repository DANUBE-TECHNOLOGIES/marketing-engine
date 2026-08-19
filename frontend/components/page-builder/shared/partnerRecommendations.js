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

const SIGNAL_BLOCK_TYPES = Object.freeze(new Set([
  "destinations",
  "destination",
  "destination-grid",
  "destinations-grid",
  "destinations-highlight",
  "destination-recommendations",
  "offers",
  "inspirations",
  "features",
  "services",
  "services-grid",
  "services-highlight",
  "rich_text",
  "rich-text",
  "text",
  "intro",
  "agency-introduction",
  "agency-story",
]));

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addSignal(target, value, source, weight = 1) {
  const normalized = normalize(value);
  if (!normalized) return;
  target.push({ value: normalized, source, weight: Math.max(1, Number(weight) || 1) });
}

function flattenContent(value, target = [], depth = 0) {
  if (depth > 5 || value === null || value === undefined) return target;
  if (typeof value === "string" || typeof value === "number") {
    target.push(String(value));
    return target;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenContent(item, target, depth + 1);
    return target;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (["imageUrl", "logoUrl", "href", "url", "imageAssetId", "logoAssetId"].includes(key)) continue;
      flattenContent(child, target, depth + 1);
    }
  }
  return target;
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
  const signals = [];
  addSignal(signals, site?.name, "site-name", 1);

  const pages = Array.isArray(site?.pages) ? site.pages : [];
  for (const page of pages) {
    const isActive = activePage && String(activePage.id) === String(page?.id);
    const pageWeight = isActive ? 3 : 2;
    addSignal(signals, page?.title, "page-title", pageWeight);
    addSignal(signals, page?.seoTitle, "page-seo-title", pageWeight);
    addSignal(signals, page?.seoDescription, "page-seo-description", pageWeight);
    addSignal(signals, page?.slug, "page-slug", 1);

    for (const block of Array.isArray(page?.blocks) ? page.blocks : []) {
      const type = String(block?.type || "").toLowerCase();
      if (type === "partner-logos" || type === "partners" || type === "logos") continue;
      if (!SIGNAL_BLOCK_TYPES.has(type)) continue;
      const values = flattenContent(block?.content || {});
      for (const value of values) addSignal(signals, value, `block:${type}`, isActive ? 4 : 3);
    }
  }

  if (activePage && !pages.some((page) => String(page?.id) === String(activePage.id))) {
    addSignal(signals, activePage.title, "active-page-title", 3);
    addSignal(signals, activePage.seoTitle, "active-page-seo-title", 3);
    addSignal(signals, activePage.seoDescription, "active-page-seo-description", 3);
    for (const block of Array.isArray(activePage.blocks) ? activePage.blocks : []) {
      const type = String(block?.type || "").toLowerCase();
      if (!SIGNAL_BLOCK_TYPES.has(type)) continue;
      for (const value of flattenContent(block?.content || {})) addSignal(signals, value, `active-block:${type}`, 4);
    }
  }

  const deduplicated = new Map();
  for (const signal of signals) {
    const key = `${signal.source}:${signal.value}`;
    const current = deduplicated.get(key);
    if (!current || signal.weight > current.weight) deduplicated.set(key, signal);
  }
  return [...deduplicated.values()];
}

function normalizeSignals(signals = []) {
  const normalized = [];
  for (const signal of Array.isArray(signals) ? signals : [signals]) {
    if (signal && typeof signal === "object" && "value" in signal) {
      const value = normalize(signal.value);
      if (value) normalized.push({ value, weight: Math.max(1, Number(signal.weight) || 1), source: signal.source || "structured" });
    } else {
      const value = normalize(signal);
      if (value) normalized.push({ value, weight: 1, source: "legacy" });
    }
  }
  return normalized;
}

export function recommendAgencyPartners({ signals = [], selected = [], networkItems = getCommonPartners(), max = 3 } = {}) {
  const requestedMax = Number(max);
  const limit = Math.max(0, Math.min(3, Number.isFinite(requestedMax) ? requestedMax : 3));
  if (limit === 0) return [];

  const normalizedSignals = normalizeSignals(signals);
  if (!normalizedSignals.length) return [];
  const haystack = normalizedSignals.map((signal) => signal.value).join(" ");

  const categoryScores = new Map();
  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const signal of normalizedSignals) {
      for (const term of rule.terms) {
        const normalizedTerm = normalize(term);
        if (normalizedTerm && signal.value.includes(normalizedTerm)) score += signal.weight;
      }
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
