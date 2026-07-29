"use strict";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function textScore(query, candidate) {
  const q = normalizeText(query);
  const c = normalizeText(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.startsWith(q)) return 92;
  if (c.includes(q)) return 84;
  const distance = levenshtein(q, c);
  const similarity = 1 - distance / Math.max(q.length, c.length);
  return Math.max(0, Math.round(similarity * 78));
}

function deduplicateRanked(items, limit = 20) {
  const byKey = new Map();
  for (const item of items) {
    const key = `${item.entityType}:${item.id}`;
    const existing = byKey.get(key);
    if (!existing || item.score > existing.score) byKey.set(key, item);
  }
  return [...byKey.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "fr"))
    .slice(0, limit);
}

function recommendationScore(source, candidate) {
  let score = 0;
  const reasons = [];
  if (source.countryId && source.countryId === candidate.countryId) {
    score += 35;
    reasons.push("same_country");
  }
  if (source.regionId && source.regionId === candidate.regionId) {
    score += 25;
    reasons.push("same_region");
  }
  const sourceThemes = new Set((source.themes || []).map((x) => x.themeId));
  const commonThemes = (candidate.themes || []).filter((x) => sourceThemes.has(x.themeId)).length;
  if (commonThemes) {
    score += Math.min(30, commonThemes * 10);
    reasons.push(`${commonThemes}_common_theme${commonThemes > 1 ? "s" : ""}`);
  }
  const sourceTypes = new Set((source.travelTypes || []).map((x) => x.travelTypeId));
  const commonTypes = (candidate.travelTypes || []).filter((x) => sourceTypes.has(x.travelTypeId)).length;
  if (commonTypes) {
    score += Math.min(20, commonTypes * 10);
    reasons.push(`${commonTypes}_common_travel_type${commonTypes > 1 ? "s" : ""}`);
  }
  return { score: Math.min(100, score), reasons };
}

module.exports = { normalizeText, levenshtein, textScore, deduplicateRanked, recommendationScore };
