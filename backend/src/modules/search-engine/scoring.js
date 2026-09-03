"use strict";

const { normalizeText, tokenize, expandQuery, fuzzySimilarity } = require("./normalization");

const FIELD_WEIGHTS = Object.freeze({
  name: 60, title: 60, slug: 48, h1: 42, country: 34, region: 28,
  tagline: 24, summary: 18, seoTitle: 20, seoDescription: 12,
  question: 24, answer: 10, themes: 18, travelTypes: 18, tags: 14,
  highlights: 12, audiences: 12, sectionText: 8, siteName: 10,
});

function scoreField(query, value, weight) {
  const q = normalizeText(query);
  const text = normalizeText(Array.isArray(value) ? value.join(" ") : value);
  if (!q || !text) return 0;
  if (text === q) return weight;
  if (text.startsWith(q)) return weight * 0.9;
  if (text.includes(q)) return weight * 0.75;
  const qTokens = tokenize(q);
  const tTokens = tokenize(text);
  const matches = qTokens.filter((token) => tTokens.some((candidate) => candidate === token || candidate.startsWith(token)));
  const tokenScore = qTokens.length ? (matches.length / qTokens.length) * weight * 0.62 : 0;
  const fuzzy = Math.max(...tTokens.map((token) => fuzzySimilarity(q, token)), fuzzySimilarity(q, text));
  const fuzzyScore = fuzzy >= 0.72 ? fuzzy * weight * 0.5 : 0;
  return Math.max(tokenScore, fuzzyScore);
}

function scoreDocument(document, query) {
  const variants = expandQuery(query);
  let best = 0;
  const matchedFields = [];
  for (const variant of variants) {
    let score = 0;
    const localMatches = [];
    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      if (document[field] == null) continue;
      const fieldScore = scoreField(variant, document[field], weight);
      if (fieldScore > 0) {
        score += fieldScore;
        localMatches.push(field);
      }
    }
    if (score > best) {
      best = score;
      matchedFields.splice(0, matchedFields.length, ...localMatches);
    }
  }
  if (document.status === "published" || document.published === true) best += 3;
  return { score: Math.round(best * 100) / 100, matchedFields: [...new Set(matchedFields)] };
}

module.exports = { FIELD_WEIGHTS, scoreField, scoreDocument };
