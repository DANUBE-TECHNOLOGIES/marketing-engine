"use strict";

const SYNONYMS = new Map([
  ["usa", "etats unis"], ["u s a", "etats unis"], ["etatsunis", "etats unis"],
  ["nyc", "new york"], ["newyork", "new york"],
  ["uk", "royaume uni"], ["gb", "royaume uni"],
  ["uae", "emirats arabes unis"],
  ["rep dominicaine", "republique dominicaine"],
  ["st barth", "saint barthelemy"], ["st martin", "saint martin"],
]);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function expandQuery(value) {
  const normalized = normalizeText(value);
  const expanded = new Set([normalized]);
  const compact = normalized.replace(/\s+/g, "");
  if (SYNONYMS.has(normalized)) expanded.add(SYNONYMS.get(normalized));
  if (SYNONYMS.has(compact)) expanded.add(SYNONYMS.get(compact));
  for (const [alias, canonical] of SYNONYMS.entries()) {
    if (normalized.includes(alias)) expanded.add(normalized.replace(alias, canonical));
  }
  return [...expanded].filter(Boolean);
}

function levenshtein(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left) return right.length;
  if (!right) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = previous[j];
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + cost);
      diagonal = saved;
    }
  }
  return previous[right.length];
}

function fuzzySimilarity(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.88;
  const distance = levenshtein(left, right);
  return Math.max(0, 1 - distance / Math.max(left.length, right.length));
}

module.exports = { normalizeText, tokenize, expandQuery, levenshtein, fuzzySimilarity, SYNONYMS };
