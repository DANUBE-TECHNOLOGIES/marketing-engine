"use strict";

const { nullableRank } = require("./heatmap");

function summaryNumber(summary, key) {
  const value = summary?.[key];
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundedDelta(from, to) {
  if (from == null || to == null) return null;
  return Math.round((to - from) * 100) / 100;
}

function compareCampaigns(fromCampaign, toCampaign) {
  if (!fromCampaign || !toCampaign) throw new TypeError("two campaigns are required");
  if (Number(fromCampaign.agencyId) !== Number(toCampaign.agencyId) || Number(fromCampaign.keywordId) !== Number(toCampaign.keywordId)) {
    const error = new Error("ranking grid campaigns are not comparable");
    error.code = "RANKING_GRID_COMPARISON_SCOPE_MISMATCH";
    throw error;
  }
  if (Number(fromCampaign.gridSize) !== Number(toCampaign.gridSize)) {
    const error = new Error("ranking grid campaign sizes differ");
    error.code = "RANKING_GRID_COMPARISON_GEOMETRY_MISMATCH";
    throw error;
  }

  const fromByCell = new Map((fromCampaign.points || []).map((point) => [`${point.row}:${point.col}`, point]));
  const toByCell = new Map((toCampaign.points || []).map((point) => [`${point.row}:${point.col}`, point]));
  const cells = [];
  let improved = 0;
  let declined = 0;
  let unchanged = 0;
  let gainedPresence = 0;
  let lostPresence = 0;

  for (let row = 0; row < Number(toCampaign.gridSize); row += 1) {
    for (let col = 0; col < Number(toCampaign.gridSize); col += 1) {
      const fromPoint = fromByCell.get(`${row}:${col}`) || null;
      const toPoint = toByCell.get(`${row}:${col}`) || null;
      const fromRank = nullableRank(fromPoint);
      const toRank = nullableRank(toPoint);
      let change = "unchanged";
      let rankDelta = null;

      if (fromRank == null && toRank != null) {
        change = "gained_presence";
        gainedPresence += 1;
      } else if (fromRank != null && toRank == null) {
        change = "lost_presence";
        lostPresence += 1;
      } else if (fromRank != null && toRank != null) {
        rankDelta = fromRank - toRank;
        if (rankDelta > 0) {
          change = "improved";
          improved += 1;
        } else if (rankDelta < 0) {
          change = "declined";
          declined += 1;
        } else {
          unchanged += 1;
        }
      } else {
        unchanged += 1;
      }

      cells.push({ row, col, fromRank, toRank, rankDelta, change });
    }
  }

  const fromSummary = fromCampaign.summary || {};
  const toSummary = toCampaign.summary || {};
  return {
    agencyId: Number(toCampaign.agencyId),
    keywordId: Number(toCampaign.keywordId),
    keyword: toCampaign.keyword,
    city: toCampaign.city,
    fromCampaignId: Number(fromCampaign.id),
    toCampaignId: Number(toCampaign.id),
    fromCompletedAt: fromCampaign.completedAt || null,
    toCompletedAt: toCampaign.completedAt || null,
    summaryDelta: {
      presenceRate: roundedDelta(summaryNumber(fromSummary, "presenceRate"), summaryNumber(toSummary, "presenceRate")),
      top3Rate: roundedDelta(summaryNumber(fromSummary, "top3Rate"), summaryNumber(toSummary, "top3Rate")),
      top10Rate: roundedDelta(summaryNumber(fromSummary, "top10Rate"), summaryNumber(toSummary, "top10Rate")),
      top20Rate: roundedDelta(summaryNumber(fromSummary, "top20Rate"), summaryNumber(toSummary, "top20Rate")),
      averagePosition: roundedDelta(summaryNumber(fromSummary, "averagePosition"), summaryNumber(toSummary, "averagePosition")),
      foundPoints: roundedDelta(summaryNumber(fromSummary, "foundPoints"), summaryNumber(toSummary, "foundPoints")),
    },
    movement: { improved, declined, unchanged, gainedPresence, lostPresence },
    cells,
  };
}

module.exports = { compareCampaigns, roundedDelta };
