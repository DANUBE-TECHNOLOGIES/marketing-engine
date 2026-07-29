"use strict";

const DEFAULT_WEIGHTS = Object.freeze({
  themes: 22,
  travelTypes: 18,
  profiles: 18,
  budget: 14,
  climate: 12,
  flightDuration: 8,
  geography: 5,
  season: 3,
});

const PROFILE_FIELDS = [
  "familyScore", "coupleScore", "luxuryScore", "adventureScore", "cultureScore",
  "beachScore", "natureScore", "nightlifeScore", "accessibilityScore",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}

function jaccard(a = [], b = []) {
  const left = new Set(a.filter(Boolean));
  const right = new Set(b.filter(Boolean));
  if (!left.size && !right.size) return null;
  const union = new Set([...left, ...right]);
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return union.size ? intersection / union.size : null;
}

function proximity(left, right, range) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return clamp(1 - Math.abs(left - right) / range, 0, 1);
}

function midpoint(min, max) {
  if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2;
  return Number.isFinite(min) ? min : Number.isFinite(max) ? max : null;
}

function getSlugs(items, key) {
  return (items || []).map((item) => item?.[key]?.slug).filter(Boolean);
}

function profileSimilarity(a, b) {
  if (!a || !b) return null;
  const scores = PROFILE_FIELDS.map((field) => proximity(a[field], b[field], 100)).filter((value) => value !== null);
  const suitability = jaccard(a.suitableFor || [], b.suitableFor || []);
  if (suitability !== null) scores.push(suitability);
  return average(scores);
}

function budgetSimilarity(a, b) {
  if (!a || !b) return null;
  const dimensions = [
    ["dailyBudgetMid", 400], ["flightBudgetMid", 2500], ["accommodationMid", 600],
  ];
  return average(dimensions.map(([field, range]) => proximity(a[field], b[field], range)).filter((value) => value !== null));
}

function climateSignature(destination) {
  const months = destination.climateMonths || [];
  if (!months.length) return null;
  return {
    temperature: average(months.map((month) => average([month.temperatureMinC, month.temperatureMaxC]))),
    rainfall: average(months.map((month) => month.rainfallMm)),
    comfort: average(months.map((month) => month.comfortScore)),
  };
}

function climateSimilarity(a, b) {
  const left = climateSignature(a);
  const right = climateSignature(b);
  if (!left || !right) return null;
  return average([
    proximity(left.temperature, right.temperature, 35),
    proximity(left.rainfall, right.rainfall, 300),
    proximity(left.comfort, right.comfort, 100),
  ].filter((value) => value !== null));
}

function flightSimilarity(a, b) {
  return proximity(
    midpoint(a.knowledge?.flightDurationMin, a.knowledge?.flightDurationMax),
    midpoint(b.knowledge?.flightDurationMin, b.knowledge?.flightDurationMax),
    1200,
  );
}

function geographySimilarity(a, b) {
  if (a.countryId && b.countryId && a.countryId === b.countryId) return 1;
  if (a.regionId && b.regionId && a.regionId === b.regionId) return 0.9;
  const continentA = a.countryRef?.continent;
  const continentB = b.countryRef?.continent;
  if (continentA && continentB && continentA === continentB) return 0.55;
  return continentA && continentB ? 0 : null;
}

function seasonSimilarity(a, b) {
  return jaccard(a.knowledge?.bestMonths || [], b.knowledge?.bestMonths || []);
}

function scoreDestinationPair(source, candidate, weights = DEFAULT_WEIGHTS) {
  const signals = {
    themes: jaccard(getSlugs(source.themes, "theme"), getSlugs(candidate.themes, "theme")),
    travelTypes: jaccard(getSlugs(source.travelTypes, "travelType"), getSlugs(candidate.travelTypes, "travelType")),
    profiles: profileSimilarity(source.travelProfile, candidate.travelProfile),
    budget: budgetSimilarity(source.budgetProfile, candidate.budgetProfile),
    climate: climateSimilarity(source, candidate),
    flightDuration: flightSimilarity(source, candidate),
    geography: geographySimilarity(source, candidate),
    season: seasonSimilarity(source, candidate),
  };

  let earned = 0;
  let availableWeight = 0;
  const reasons = [];
  for (const [name, similarity] of Object.entries(signals)) {
    if (similarity === null) continue;
    const weight = Number(weights[name] || 0);
    availableWeight += weight;
    earned += similarity * weight;
    if (similarity >= 0.65) reasons.push({ criterion: name, similarity: Math.round(similarity * 100) });
  }
  const coverage = Object.values(signals).filter((value) => value !== null).length / Object.keys(signals).length;
  const normalized = availableWeight ? earned / availableWeight : 0;
  const confidenceFactor = 0.75 + coverage * 0.25;
  const score = Math.round(clamp(normalized * confidenceFactor * 100, 0, 100));

  return {
    sourceId: source.id,
    targetId: candidate.id,
    score,
    coverage: Math.round(coverage * 100),
    signals: Object.fromEntries(Object.entries(signals).map(([key, value]) => [key, value === null ? null : Math.round(value * 100)])),
    reasons: reasons.sort((a, b) => b.similarity - a.similarity),
  };
}

function rankCandidates(source, candidates, options = {}) {
  const limit = clamp(Number(options.limit || 8), 1, 50);
  const minScore = clamp(Number(options.minScore ?? 35), 0, 100);
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };
  return candidates
    .filter((candidate) => candidate.id !== source.id)
    .map((candidate) => ({ candidate, ...scoreDestinationPair(source, candidate, weights) }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage || a.candidate.slug.localeCompare(b.candidate.slug))
    .slice(0, limit);
}

module.exports = {
  DEFAULT_WEIGHTS,
  PROFILE_FIELDS,
  clamp,
  jaccard,
  proximity,
  scoreDestinationPair,
  rankCandidates,
};
