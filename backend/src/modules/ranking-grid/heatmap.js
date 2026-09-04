"use strict";

function nullableRank(point) {
  if (!point || point.found !== true) return null;
  if (point.position == null || point.position === "") return null;
  const value = Number(point.position);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function bandForRank(rank) {
  if (rank == null) return "not_found";
  if (rank <= 3) return "top3";
  if (rank <= 10) return "top10";
  if (rank <= 20) return "top20";
  return "beyond20";
}

function buildHeatmap(campaign) {
  if (!campaign || !Array.isArray(campaign.points)) {
    throw new TypeError("campaign with points is required");
  }

  const gridSize = Number(campaign.gridSize);
  const rows = [];

  for (let row = 0; row < gridSize; row += 1) {
    const cells = [];
    for (let col = 0; col < gridSize; col += 1) {
      const point = campaign.points.find((item) => Number(item.row) === row && Number(item.col) === col) || null;
      const rank = nullableRank(point);
      cells.push({
        row,
        col,
        latitude: point == null ? null : Number(point.latitude),
        longitude: point == null ? null : Number(point.longitude),
        northKm: point == null ? null : Number(point.northKm),
        eastKm: point == null ? null : Number(point.eastKm),
        status: point?.status || "missing",
        found: point?.found === true,
        rank,
        absoluteRank: point?.found === true && point?.absolutePosition != null && Number(point.absolutePosition) > 0
          ? Number(point.absolutePosition)
          : null,
        band: bandForRank(rank),
        title: point?.title || null,
        rating: point?.rating == null ? null : Number(point.rating),
        reviews: point?.reviews == null ? null : Number(point.reviews),
        checkedAt: point?.checkedAt || null,
      });
    }
    rows.push(cells);
  }

  return {
    campaignId: Number(campaign.id),
    agencyId: Number(campaign.agencyId),
    keywordId: Number(campaign.keywordId),
    keyword: campaign.keyword,
    city: campaign.city,
    status: campaign.status,
    provider: campaign.provider,
    gridSize,
    spacingKm: Number(campaign.spacingKm),
    center: {
      latitude: Number(campaign.centerLat),
      longitude: Number(campaign.centerLng),
    },
    summary: campaign.summary || null,
    legend: {
      top3: "1-3",
      top10: "4-10",
      top20: "11-20",
      beyond20: ">20",
      not_found: null,
    },
    rows,
  };
}

module.exports = {
  nullableRank,
  bandForRank,
  buildHeatmap,
};
