"use strict";

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function rankFor(point) {
  if (!point || point.found !== true) return null;
  const rank = Number(point.position);
  return Number.isFinite(rank) && rank > 0 ? rank : null;
}

function distanceKm(point) {
  const north = Number(point?.northKm);
  const east = Number(point?.eastKm);
  if (!Number.isFinite(north) || !Number.isFinite(east)) return null;
  return Math.sqrt((north ** 2) + (east ** 2));
}

function directionFor(point) {
  const north = Number(point?.northKm);
  const east = Number(point?.eastKm);
  if (!Number.isFinite(north) || !Number.isFinite(east)) return "unknown";
  if (Math.abs(north) < 0.001 && Math.abs(east) < 0.001) return "center";
  if (Math.abs(north) >= Math.abs(east)) return north >= 0 ? "north" : "south";
  return east >= 0 ? "east" : "west";
}

function rankBand(rank) {
  if (rank == null) return "not_found";
  if (rank <= 3) return "top3";
  if (rank <= 10) return "top10";
  if (rank <= 20) return "top20";
  return "beyond20";
}

function priorityScore(point) {
  const rank = rankFor(point);
  if (rank == null) return 100;
  const distance = distanceKm(point) || 0;
  const rankComponent = Math.min(80, Math.max(0, rank - 3) * 2);
  const distanceComponent = Math.min(20, distance * 5);
  return round(rankComponent + distanceComponent, 2);
}

function priorityLevel(score) {
  if (score >= 60) return "p1";
  if (score >= 35) return "p2";
  if (score >= 15) return "p3";
  return "monitor";
}

function analyzeGeoPriorities(campaign) {
  if (!campaign || !Array.isArray(campaign.points)) {
    throw new TypeError("campaign with points is required");
  }

  const cells = campaign.points.map((point) => {
    const rank = rankFor(point);
    const score = priorityScore(point);
    return {
      row: Number(point.row),
      col: Number(point.col),
      latitude: point.latitude == null ? null : Number(point.latitude),
      longitude: point.longitude == null ? null : Number(point.longitude),
      northKm: Number(point.northKm),
      eastKm: Number(point.eastKm),
      distanceKm: round(distanceKm(point), 2),
      direction: directionFor(point),
      rank,
      band: rankBand(rank),
      score,
      priority: priorityLevel(score),
    };
  }).sort((a, b) => b.score - a.score || (b.rank ?? 999) - (a.rank ?? 999));

  const counts = { p1: 0, p2: 0, p3: 0, monitor: 0 };
  const byDirection = {};
  for (const cell of cells) {
    counts[cell.priority] += 1;
    if (!byDirection[cell.direction]) {
      byDirection[cell.direction] = { cells: 0, p1: 0, p2: 0, p3: 0, monitor: 0, averageRank: null, ranks: [] };
    }
    const bucket = byDirection[cell.direction];
    bucket.cells += 1;
    bucket[cell.priority] += 1;
    if (cell.rank != null) bucket.ranks.push(cell.rank);
  }

  for (const bucket of Object.values(byDirection)) {
    bucket.averageRank = bucket.ranks.length
      ? round(bucket.ranks.reduce((sum, value) => sum + value, 0) / bucket.ranks.length, 2)
      : null;
    delete bucket.ranks;
  }

  const actionable = cells.filter((cell) => cell.priority !== "monitor");
  return {
    campaignId: Number(campaign.id),
    agencyId: Number(campaign.agencyId),
    city: campaign.city,
    center: {
      latitude: Number(campaign.centerLat),
      longitude: Number(campaign.centerLng),
    },
    summary: {
      cells: cells.length,
      actionableCells: actionable.length,
      ...counts,
      dominantPriorityDirection: Object.entries(byDirection)
        .filter(([direction]) => direction !== "center")
        .sort((a, b) => (b[1].p1 * 3 + b[1].p2 * 2 + b[1].p3) - (a[1].p1 * 3 + a[1].p2 * 2 + a[1].p3))[0]?.[0] || null,
    },
    byDirection,
    priorityCells: actionable,
    cells,
  };
}

module.exports = {
  rankFor,
  distanceKm,
  directionFor,
  rankBand,
  priorityScore,
  priorityLevel,
  analyzeGeoPriorities,
};
