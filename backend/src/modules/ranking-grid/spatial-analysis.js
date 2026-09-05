"use strict";

function rankFor(point) {
  if (!point || point.found !== true) return null;
  const rank = Number(point.position);
  return Number.isFinite(rank) && rank > 0 ? rank : null;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function pointDistanceKm(point) {
  const north = Number(point?.northKm);
  const east = Number(point?.eastKm);
  if (!Number.isFinite(north) || !Number.isFinite(east)) return null;
  return Math.sqrt((north ** 2) + (east ** 2));
}

function pointRing(point) {
  const distance = pointDistanceKm(point);
  if (distance == null) return "unknown";
  if (distance < 0.25) return "center";
  if (distance <= 1.5) return "inner";
  return "outer";
}

function pointDirection(point) {
  const north = Number(point?.northKm);
  const east = Number(point?.eastKm);
  if (!Number.isFinite(north) || !Number.isFinite(east)) return "unknown";
  if (Math.abs(north) < 0.001 && Math.abs(east) < 0.001) return "center";
  if (Math.abs(north) >= Math.abs(east)) return north >= 0 ? "north" : "south";
  return east >= 0 ? "east" : "west";
}

function summarizePoints(points) {
  const ranked = points
    .map((point) => ({ point, rank: rankFor(point) }))
    .filter((entry) => entry.rank != null);
  const ranks = ranked.map((entry) => entry.rank);
  return {
    points: points.length,
    found: ranked.length,
    averagePosition: round(average(ranks)),
    bestPosition: ranks.length ? Math.min(...ranks) : null,
    worstPosition: ranks.length ? Math.max(...ranks) : null,
    top3: ranked.filter((entry) => entry.rank <= 3).length,
    top10: ranked.filter((entry) => entry.rank <= 10).length,
    top20: ranked.filter((entry) => entry.rank <= 20).length,
    top3Rate: ranked.length ? round(ranked.filter((entry) => entry.rank <= 3).length / ranked.length, 3) : 0,
    top10Rate: ranked.length ? round(ranked.filter((entry) => entry.rank <= 10).length / ranked.length, 3) : 0,
    top20Rate: ranked.length ? round(ranked.filter((entry) => entry.rank <= 20).length / ranked.length, 3) : 0,
  };
}

function groupSummary(points, classifier, labels) {
  return Object.fromEntries(labels.map((label) => {
    const subset = points.filter((point) => classifier(point) === label);
    return [label, summarizePoints(subset)];
  }));
}

function campaignSeverity(metrics) {
  if ((metrics.averagePosition ?? Infinity) > 10 || metrics.top10Rate < 0.5) return "critical";
  if ((metrics.averagePosition ?? Infinity) > 5 || metrics.top10Rate < 0.8) return "watch";
  return "strong";
}

function analyzeSpatialCampaign(campaign) {
  if (!campaign || !Array.isArray(campaign.points)) {
    throw new TypeError("campaign with points is required");
  }

  const points = campaign.points;
  const overall = summarizePoints(points);
  const rings = groupSummary(points, pointRing, ["center", "inner", "outer"]);
  const directions = groupSummary(points, pointDirection, ["north", "south", "east", "west"]);
  const directionRows = Object.entries(directions)
    .filter(([, summary]) => summary.found > 0 && summary.averagePosition != null)
    .map(([direction, summary]) => ({ direction, averagePosition: summary.averagePosition }));
  const bestDirection = [...directionRows].sort((a, b) => a.averagePosition - b.averagePosition)[0] || null;
  const worstDirection = [...directionRows].sort((a, b) => b.averagePosition - a.averagePosition)[0] || null;
  const centerRank = rings.center.averagePosition;
  const outerAverage = rings.outer.averagePosition;

  const weakestCells = points
    .map((point) => ({
      row: Number(point.row),
      col: Number(point.col),
      northKm: Number(point.northKm),
      eastKm: Number(point.eastKm),
      distanceKm: round(pointDistanceKm(point)),
      direction: pointDirection(point),
      rank: rankFor(point),
    }))
    .filter((cell) => cell.rank != null)
    .sort((a, b) => b.rank - a.rank || b.distanceKm - a.distanceKm || a.row - b.row || a.col - b.col)
    .slice(0, 5);

  return {
    campaignId: Number(campaign.id),
    agencyId: Number(campaign.agencyId),
    agencyName: campaign.agencyName || null,
    city: campaign.city,
    keyword: campaign.keyword,
    status: campaign.status,
    gridSize: Number(campaign.gridSize),
    spacingKm: Number(campaign.spacingKm),
    overall,
    rings,
    directions,
    decay: {
      centerRank,
      innerAveragePosition: rings.inner.averagePosition,
      outerAveragePosition: outerAverage,
      outerMinusCenter: centerRank != null && outerAverage != null ? round(outerAverage - centerRank) : null,
    },
    asymmetry: {
      bestDirection,
      worstDirection,
      delta: bestDirection && worstDirection
        ? round(worstDirection.averagePosition - bestDirection.averagePosition)
        : null,
    },
    weakestCells,
    severity: campaignSeverity(overall),
  };
}

function buildSpatialReport(campaigns = []) {
  const rows = campaigns.map(analyzeSpatialCampaign)
    .sort((a, b) => (a.overall.averagePosition ?? Infinity) - (b.overall.averagePosition ?? Infinity));
  const critical = rows.filter((row) => row.severity === "critical");
  const watch = rows.filter((row) => row.severity === "watch");
  const strong = rows.filter((row) => row.severity === "strong");
  return {
    mode: "read_only",
    providerCalls: 0,
    executionTriggered: false,
    summary: {
      campaigns: rows.length,
      strong: strong.length,
      watch: watch.length,
      critical: critical.length,
      bestCampaignId: rows[0]?.campaignId || null,
      worstCampaignId: rows.at(-1)?.campaignId || null,
      worstCity: rows.at(-1)?.city || null,
    },
    campaigns: rows,
  };
}

module.exports = {
  rankFor,
  pointDistanceKm,
  pointRing,
  pointDirection,
  summarizePoints,
  analyzeSpatialCampaign,
  buildSpatialReport,
};
