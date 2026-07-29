"use strict";

const DEFAULT_WEIGHTS = Object.freeze({
  relation: 28,
  geography: 18,
  themes: 18,
  travelTypes: 14,
  tags: 8,
  audience: 6,
  duration: 4,
  freshness: 4
});

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function ids(items, key) {
  return new Set((items || []).map(item => String(item?.[key] ?? item?.id ?? item)).filter(Boolean));
}

function overlapRatio(left, right) {
  const a = left instanceof Set ? left : new Set(left || []);
  const b = right instanceof Set ? right : new Set(right || []);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const value of a) if (b.has(value)) common += 1;
  return common / Math.max(a.size, b.size);
}

function haversineKm(a, b) {
  if (![a?.latitude, a?.longitude, b?.latitude, b?.longitude].every(Number.isFinite)) return null;
  const toRad = degree => degree * Math.PI / 180;
  const earth = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function geographyScore(source, target) {
  if (source.cityId && source.cityId === target.cityId) return { score: 1, reason: "same_city" };
  if (source.regionId && source.regionId === target.regionId) return { score: 0.9, reason: "same_region" };
  if ((source.countryId && source.countryId === target.countryId) || source.country === target.country) {
    return { score: 0.72, reason: "same_country" };
  }
  const distance = haversineKm(source, target);
  if (distance === null) return { score: 0, reason: null };
  if (distance <= 150) return { score: 0.8, reason: "nearby_150km" };
  if (distance <= 500) return { score: 0.55, reason: "nearby_500km" };
  if (distance <= 1200) return { score: 0.25, reason: "nearby_1200km" };
  return { score: 0, reason: null };
}

function relationScore(source, target) {
  const relation = (source.relationsFrom || []).find(item => item.targetId === target.id);
  if (!relation) return { score: 0, reason: null, relation: null };
  return {
    score: clamp(relation.score) / 100,
    reason: `relation_${relation.relationType || "similar"}`,
    relation
  };
}

function freshnessScore(destination, now = Date.now()) {
  const date = new Date(destination.updatedAt || destination.publishedAt || destination.createdAt || 0).getTime();
  if (!Number.isFinite(date) || date <= 0) return 0;
  const ageDays = Math.max(0, (now - date) / 86400000);
  if (ageDays <= 30) return 1;
  if (ageDays <= 180) return 0.65;
  if (ageDays <= 365) return 0.35;
  return 0.1;
}

function durationAffinity(source, target) {
  const normalize = value => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const a = normalize(source.idealDuration);
  const b = normalize(target.idealDuration);
  return a && b && a === b ? 1 : 0;
}

function scoreDestinationPair(source, target, options = {}) {
  if (!source || !target || source.id === target.id) return null;
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };
  const geo = geographyScore(source, target);
  const relation = relationScore(source, target);
  const themeRatio = overlapRatio(ids(source.themes, "themeId"), ids(target.themes, "themeId"));
  const travelRatio = overlapRatio(ids(source.travelTypes, "travelTypeId"), ids(target.travelTypes, "travelTypeId"));
  const tagRatio = overlapRatio(ids(source.tags, "tagId"), ids(target.tags, "tagId"));
  const audienceRatio = overlapRatio(new Set(source.audiences || []), new Set(target.audiences || []));
  const duration = durationAffinity(source, target);
  const freshness = freshnessScore(target, options.now);

  const components = {
    relation: relation.score * weights.relation,
    geography: geo.score * weights.geography,
    themes: themeRatio * weights.themes,
    travelTypes: travelRatio * weights.travelTypes,
    tags: tagRatio * weights.tags,
    audience: audienceRatio * weights.audience,
    duration: duration * weights.duration,
    freshness: freshness * weights.freshness
  };
  const score = Math.round(Object.values(components).reduce((sum, value) => sum + value, 0));
  const reasons = [relation.reason, geo.reason].filter(Boolean);
  if (themeRatio) reasons.push("shared_themes");
  if (travelRatio) reasons.push("shared_travel_types");
  if (tagRatio) reasons.push("shared_tags");
  if (audienceRatio) reasons.push("shared_audiences");
  if (duration) reasons.push("same_duration");

  return {
    sourceId: source.id,
    targetId: target.id,
    score: clamp(score),
    reasons,
    components: Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Math.round(value)])),
    distanceKm: haversineKm(source, target),
    relation: relation.relation ? {
      type: relation.relation.relationType,
      origin: relation.relation.origin,
      score: relation.relation.score
    } : null
  };
}

module.exports = {
  DEFAULT_WEIGHTS,
  clamp,
  overlapRatio,
  haversineKm,
  geographyScore,
  scoreDestinationPair
};
