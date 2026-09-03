"use strict";

function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function calculateScore(query, item, aliasMatch = false) {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedName = normalizeSearchValue(item.name);
  const normalizedSlug = normalizeSearchValue(
    String(item.slug || "").replace(/-/g, " ")
  );

  let score = 0;

  if (normalizedName === normalizedQuery) score += 100;
  else if (normalizedSlug === normalizedQuery) score += 95;
  else if (normalizedName.startsWith(normalizedQuery)) score += 75;
  else if (normalizedSlug.startsWith(normalizedQuery)) score += 70;
  else if (normalizedName.includes(normalizedQuery)) score += 55;
  else if (normalizedSlug.includes(normalizedQuery)) score += 50;

  if (aliasMatch) score += 90;

  if (item.status === "published" || item.status === "active") {
    score += 5;
  }

  const typeBoost = {
    destination: 8,
    country: 6,
    city: 4,
    region: 2,
  };

  score += typeBoost[item.type] || 0;

  return Math.min(score, 200);
}

function mergeSearchItems(query, directItems, aliasItems, limit = 20) {
  const results = new Map();

  function add(item, aliasMatch = false) {
    const key = `${item.type}:${item.id}`;
    const score = calculateScore(query, item, aliasMatch);
    const existing = results.get(key);

    if (!existing || score > existing.score) {
      results.set(key, {
        ...item,
        score,
        matchedBy: aliasMatch ? "alias" : "direct",
      });
    }
  }

  directItems.forEach((item) => add(item, false));
  aliasItems.forEach((item) => add(item, true));

  return [...results.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.name.localeCompare(right.name, "fr");
    })
    .slice(0, limit);
}

module.exports = {
  normalizeSearchValue,
  calculateScore,
  mergeSearchItems,
};
