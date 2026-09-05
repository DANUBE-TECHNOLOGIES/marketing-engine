"use strict";

const { Prisma } = require("@prisma/client");

const DEFAULT_ESTIMATED_COST_PER_POINT_USD = 0.002;

function normalizeCampaignIds(value) {
  if (value == null || value === "") return [];
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const ids = raw
    .map((item) => Number(String(item).trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
  return [...new Set(ids)];
}

function estimatedCost(points, unitCost = DEFAULT_ESTIMATED_COST_PER_POINT_USD) {
  const count = Math.max(0, Number(points) || 0);
  const rate = Math.max(0, Number(unitCost) || 0);
  return Number((count * rate).toFixed(6));
}

async function loadPaidRolloutPlan(prisma, tenantId, { campaignIds = [], estimatedCostPerPointUsd = DEFAULT_ESTIMATED_COST_PER_POINT_USD } = {}) {
  if (typeof prisma?.$queryRaw !== "function") {
    const error = new Error("Paid rollout planning requires Prisma raw-query capability");
    error.code = "RANKING_GRID_PAID_PLAN_PRISMA_UNAVAILABLE";
    throw error;
  }

  const selectedIds = normalizeCampaignIds(campaignIds);
  const selectedFilter = selectedIds.length
    ? Prisma.sql`AND c.id IN (${Prisma.join(selectedIds)})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT
      c.id AS "campaignId",
      c."agencyId",
      a.name AS "agencyName",
      a.city,
      c."keywordId",
      c.keyword,
      c.status AS "campaignStatus",
      c."gridSize",
      c."spacingKm",
      COUNT(p.id)::int AS "totalPoints",
      COUNT(p.id) FILTER (WHERE p.status = 'success')::int AS "successPoints",
      COUNT(p.id) FILTER (WHERE p.status <> 'success')::int AS "remainingPoints",
      COALESCE(SUM(p.cost), 0)::float8 AS "recordedCostUsd"
    FROM "RankingGridCampaign" c
    INNER JOIN "Agency" a ON a.id = c."agencyId"
    LEFT JOIN "RankingGridPoint" p ON p."campaignId" = c.id
    WHERE a."tenantId" = ${tenantId}
      ${selectedFilter}
    GROUP BY c.id, c."agencyId", a.name, a.city, c."keywordId", c.keyword, c.status, c."gridSize", c."spacingKm"
    ORDER BY c."agencyId" ASC, c.id ASC
  `);

  const unitCost = Math.max(0, Number(estimatedCostPerPointUsd) || DEFAULT_ESTIMATED_COST_PER_POINT_USD);
  const campaigns = rows.map((row) => {
    const remainingPoints = Number(row.remainingPoints) || 0;
    return {
      campaignId: Number(row.campaignId),
      agencyId: Number(row.agencyId),
      agencyName: row.agencyName,
      city: row.city,
      keywordId: Number(row.keywordId),
      keyword: row.keyword,
      campaignStatus: row.campaignStatus,
      gridSize: Number(row.gridSize),
      spacingKm: Number(row.spacingKm),
      totalPoints: Number(row.totalPoints) || 0,
      successPoints: Number(row.successPoints) || 0,
      remainingPoints,
      eligible: remainingPoints > 0,
      estimatedCostUsd: estimatedCost(remainingPoints, unitCost),
      recordedCostUsd: Number(row.recordedCostUsd) || 0,
    };
  });

  const eligible = campaigns.filter((campaign) => campaign.eligible);
  const remainingPoints = eligible.reduce((sum, campaign) => sum + campaign.remainingPoints, 0);

  return {
    pricing: {
      estimatedCostPerPointUsd: unitCost,
      basis: "pilot_observed_cost",
      guaranteed: false,
    },
    summary: {
      campaigns: campaigns.length,
      eligibleCampaigns: eligible.length,
      completedCampaigns: campaigns.filter((campaign) => !campaign.eligible).length,
      remainingPoints,
      estimatedCostUsd: estimatedCost(remainingPoints, unitCost),
      recordedCostUsd: Number(campaigns.reduce((sum, campaign) => sum + campaign.recordedCostUsd, 0).toFixed(6)),
    },
    campaigns,
  };
}

module.exports = {
  DEFAULT_ESTIMATED_COST_PER_POINT_USD,
  normalizeCampaignIds,
  estimatedCost,
  loadPaidRolloutPlan,
};
