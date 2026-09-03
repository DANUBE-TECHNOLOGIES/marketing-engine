"use strict";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function ratioScore(done, total) {
  if (!total) return 0;
  return clamp((done / total) * 100);
}

function freshnessScore(pages, now = new Date()) {
  if (!pages.length) return 0;
  const fresh = pages.filter((page) => {
    const date = new Date(page.updatedAt || page.createdAt || 0);
    return Number.isFinite(date.getTime()) && (now - date) / 86400000 <= 180;
  }).length;
  return ratioScore(fresh, pages.length);
}

function scoreSiteSignals({ pages = [], pagePlans = [], campaigns = [], destinations = [], now = new Date() }) {
  const published = pages.filter((p) => p.published || p.status === "published").length;
  const quality = pagePlans.length
    ? pagePlans.reduce((sum, plan) => sum + plan.score, 0) / pagePlans.length
    : 0;
  const linking = pagePlans.length
    ? pagePlans.reduce((sum, plan) => sum + clamp((plan.metrics.links / 3) * 100), 0) / pagePlans.length
    : 0;
  const activeCampaigns = campaigns.filter((c) => ["scheduled", "publishing", "published"].includes(c.status)).length;
  const publication = clamp(activeCampaigns * 20);
  const coverage = destinations.length
    ? ratioScore(new Set(pages.map((p) => p.slug)).size, destinations.length)
    : clamp(pages.length * 10);

  const dimensions = {
    contentQuality: clamp(quality),
    publicationReadiness: ratioScore(published, pages.length),
    internalLinking: clamp(linking),
    freshness: freshnessScore(pages, now),
    destinationCoverage: coverage,
    marketingActivity: publication
  };

  const weights = {
    contentQuality: 0.30,
    publicationReadiness: 0.20,
    internalLinking: 0.15,
    freshness: 0.15,
    destinationCoverage: 0.10,
    marketingActivity: 0.10
  };

  const global = clamp(Object.entries(weights).reduce((sum, [key, weight]) => sum + dimensions[key] * weight, 0));
  return { global, dimensions, weights };
}

module.exports = { clamp, ratioScore, freshnessScore, scoreSiteSignals };
