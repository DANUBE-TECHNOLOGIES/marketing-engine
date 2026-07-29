"use strict";

const { createSearchRepository } = require("./repository");
const { normalizeText, fuzzySimilarity } = require("./normalization");
const { scoreDocument } = require("./scoring");

function number(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function matchesFilter(document, filters) {
  const eq = (left, right) => normalizeText(left) === normalizeText(right);
  if (filters.entityTypes.length && !filters.entityTypes.includes(document.entityType)) return false;
  if (filters.status && !eq(document.status, filters.status)) return false;
  if (filters.country && !eq(document.country, filters.country)) return false;
  if (filters.region && !eq(document.region, filters.region)) return false;
  if (filters.site && ![document.siteId, document.siteSlug].some((value) => eq(value, filters.site))) return false;
  if (filters.pageType && !eq(document.pageType, filters.pageType)) return false;
  if (filters.theme && !(document.themeSlugs || []).some((value) => eq(value, filters.theme))) return false;
  if (filters.travelType && !(document.travelTypeSlugs || []).some((value) => eq(value, filters.travelType))) return false;
  if (filters.tag && !(document.tagSlugs || []).some((value) => eq(value, filters.tag))) return false;
  return true;
}

function buildFacets(documents) {
  const keys = ["entityType", "country", "region", "status", "pageType", "siteSlug"];
  const facets = {};
  for (const key of keys) {
    const counts = new Map();
    for (const document of documents) {
      const value = document[key];
      if (!value) continue;
      counts.set(String(value), (counts.get(String(value)) || 0) + 1);
    }
    facets[key] = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }
  for (const [key, source] of [["themes", "themeSlugs"], ["travelTypes", "travelTypeSlugs"], ["tags", "tagSlugs"]]) {
    const counts = new Map();
    for (const document of documents) for (const value of document[source] || []) counts.set(value, (counts.get(value) || 0) + 1);
    facets[key] = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }
  return facets;
}

function createSearchService(prisma) {
  const repository = createSearchRepository(prisma);

  async function search(options = {}) {
    const query = String(options.q || options.query || "").trim();
    const filters = {
      entityTypes: list(options.type || options.entityType || "destination,page"),
      status: options.status || null, country: options.country || null, region: options.region || null,
      site: options.site || null, pageType: options.pageType || null, theme: options.theme || null,
      travelType: options.travelType || null, tag: options.tag || null,
    };
    const limit = number(options.limit, 20, 1, 100);
    const offset = number(options.offset, 0, 0, 100000);
    const minimumScore = Number(options.minScore || 1);
    const documents = await repository.loadAll(filters.entityTypes);
    const filtered = documents.filter((document) => matchesFilter(document, filters));
    const ranked = filtered.map((document) => ({ ...document, ...scoreDocument(document, query) }))
      .filter((document) => !query || document.score >= minimumScore)
      .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
    return {
      query, total: ranked.length, limit, offset,
      results: ranked.slice(offset, offset + limit).map(({ sectionText, answer, question, ...result }) => result),
      facets: buildFacets(ranked),
    };
  }

  async function suggest(options = {}) {
    const query = String(options.q || options.query || "").trim();
    const limit = number(options.limit, 8, 1, 20);
    if (!query) return { query, suggestions: [] };
    const documents = await repository.loadAll(list(options.type || "destination,page"));
    const suggestions = documents.map((document) => {
      const label = document.name || document.title;
      const similarity = Math.max(fuzzySimilarity(query, label), fuzzySimilarity(query, document.slug));
      const prefix = normalizeText(label).startsWith(normalizeText(query)) ? 0.4 : 0;
      return { label, slug: document.slug, url: document.url, entityType: document.entityType, score: Math.round((similarity + prefix) * 1000) / 1000 };
    }).filter((item) => item.score >= 0.35).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, limit);
    return { query, suggestions };
  }

  async function facets(options = {}) {
    const documents = await repository.loadAll(list(options.type || "destination,page"));
    return { total: documents.length, facets: buildFacets(documents) };
  }

  async function popular(options = {}) {
    const limit = number(options.limit, 10, 1, 50);
    const documents = await repository.loadAll(list(options.type || "destination,page"));
    const results = documents.sort((a, b) => Number(b.published) - Number(a.published) || new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, limit)
      .map(({ sectionText, answer, question, ...item }) => item);
    return { total: results.length, results };
  }

  async function related(slug, options = {}) {
    const all = await repository.loadDestinations();
    const origin = all.find((item) => item.slug === slug);
    if (!origin) { const error = new Error(`Destination introuvable: ${slug}`); error.statusCode = 404; throw error; }
    const limit = number(options.limit, 8, 1, 30);
    const scored = all.filter((item) => item.id !== origin.id).map((item) => {
      let score = 0;
      if (origin.country && item.country === origin.country) score += 35;
      if (origin.region && item.region === origin.region) score += 20;
      score += (origin.themeSlugs || []).filter((value) => (item.themeSlugs || []).includes(value)).length * 18;
      score += (origin.travelTypeSlugs || []).filter((value) => (item.travelTypeSlugs || []).includes(value)).length * 15;
      score += (origin.tagSlugs || []).filter((value) => (item.tagSlugs || []).includes(value)).length * 8;
      return { ...item, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
      .map(({ sectionText, answer, question, ...item }) => item);
    return { origin: { id: origin.id, name: origin.name, slug: origin.slug }, total: scored.length, results: scored };
  }

  return { search, suggest, facets, popular, related };
}

module.exports = { createSearchService, matchesFilter, buildFacets };
