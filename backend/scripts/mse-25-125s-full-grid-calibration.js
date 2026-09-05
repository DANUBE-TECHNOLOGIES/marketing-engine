"use strict";

const { PrismaClient } = require("@prisma/client");
const { RankingGridRepository } = require("../src/modules/ranking-grid/repository");
const { DataForSeoMapsRankingGridProvider } = require("../src/modules/ranking-grid/dataforseo-provider");
const {
  OBSERVED_UNIT_COST_USD,
  placeIdFromGoogleReviewUrl,
  dataForSeoBalance,
} = require("./mse-25-125r-calibration-probe");

const EXPECTED_ACK = "RUN-FULL-GRID-RANKING-CALIBRATION";
const DEFAULT_CAMPAIGN_ID = 4;
const DEFAULT_ZOOM = 14;
const MAX_CALLS = 25;
const DEFAULT_MAX_COST_USD = 0.05;

function parseZoom(value) {
  const zoom = Number(value == null || value === "" ? DEFAULT_ZOOM : value);
  if (!Number.isInteger(zoom) || zoom < 3 || zoom > 21) {
    throw new Error("MSE_25_125S_ZOOM must be an integer Google Maps zoom between 3 and 21");
  }
  return zoom;
}

async function loadCampaignContext({ prisma, campaignId }) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "mondescale" },
    select: { id: true },
  });
  if (!tenant) throw new Error("tenant mondescale not found");

  const repository = new RankingGridRepository(prisma);
  const campaign = await repository.getCampaign({ tenantId: tenant.id, campaignId });
  if (!campaign) throw new Error("campaign not found");
  if (Number(campaign.gridSize) !== 5) throw new Error("full-grid calibration requires a 5x5 campaign");
  if (!Array.isArray(campaign.points) || campaign.points.length !== 25) {
    throw new Error("full-grid calibration requires exactly 25 stored points");
  }

  const agency = await prisma.agency.findFirst({
    where: { id: Number(campaign.agencyId), tenantId: tenant.id },
    include: { profile: true },
  });
  if (!agency) throw new Error("campaign agency not found");

  const googleData = agency?.profile?.googleLocationData && typeof agency.profile.googleLocationData === "object"
    ? agency.profile.googleLocationData
    : {};
  const target = {
    name: agency.name || null,
    address: agency.address || null,
    postalCode: agency.postalCode || null,
    website: agency.website || null,
    placeId: googleData.placeId || googleData.place_id || placeIdFromGoogleReviewUrl(agency.googleReviewUrl),
    cid: googleData.cid || null,
  };
  if (!target.placeId && !target.cid && !target.name) throw new Error("agency target identity unavailable");

  const points = [...campaign.points]
    .sort((a, b) => Number(a.row) - Number(b.row) || Number(a.col) - Number(b.col))
    .map((p) => ({
      row: Number(p.row),
      col: Number(p.col),
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      historicalFound: p.found === true,
      historicalPosition: p.position == null ? null : Number(p.position),
    }));

  return { tenant, campaign, agency, target, points };
}

async function main() {
  if (String(process.env.MSE_25_125S_PAID_ACK || "") !== EXPECTED_ACK) {
    throw new Error(`set MSE_25_125S_PAID_ACK=${EXPECTED_ACK}`);
  }
  if (String(process.env.RANKING_GRID_DATAFORSEO_ENABLED || "false").toLowerCase() !== "true") {
    throw new Error("provider must be explicitly enabled for the paid full-grid calibration");
  }

  const campaignId = Number(process.env.MSE_25_125S_CAMPAIGN_ID || DEFAULT_CAMPAIGN_ID);
  if (!Number.isInteger(campaignId) || campaignId <= 0) throw new Error("invalid campaign id");
  const zoom = parseZoom(process.env.MSE_25_125S_ZOOM);
  const maxCost = Number(process.env.MSE_25_125S_MAX_COST_USD || DEFAULT_MAX_COST_USD);
  if (!Number.isFinite(maxCost) || maxCost <= 0) throw new Error("invalid max cost");

  const estimate = MAX_CALLS * OBSERVED_UNIT_COST_USD;
  if (estimate > maxCost + 1e-9) {
    throw new Error(`estimated cost ${estimate.toFixed(3)} exceeds max ${maxCost.toFixed(3)}`);
  }

  const minBalance = Number(process.env.MSE_25_125S_MIN_BALANCE_USD || 0.10);
  if (!Number.isFinite(minBalance) || minBalance < 0) throw new Error("invalid minimum balance");
  const balance = await dataForSeoBalance({
    login: process.env.DATAFORSEO_LOGIN,
    password: process.env.DATAFORSEO_PASSWORD,
  });
  if (balance < minBalance + estimate) {
    throw new Error(`DataForSEO balance ${balance.toFixed(6)} is below required ${(minBalance + estimate).toFixed(6)}`);
  }

  const prisma = new PrismaClient();
  try {
    const { campaign, agency, target, points } = await loadCampaignContext({ prisma, campaignId });
    if (points.length > MAX_CALLS) throw new Error(`probe would issue ${points.length} calls; hard cap is ${MAX_CALLS}`);

    console.log(JSON.stringify({
      phase: "preflight",
      campaignId,
      agency: agency.name,
      city: campaign.city,
      keyword: campaign.keyword,
      zoom,
      calls: points.length,
      estimatedCostUsd: estimate,
      maxCostUsd: maxCost,
      balanceUsd: balance,
      databaseWrites: 0,
    }));

    const provider = new DataForSeoMapsRankingGridProvider({
      zoom,
      targetResolver: async () => target,
    });

    const results = [];
    let actualCostUsd = 0;
    for (const point of points) {
      if (actualCostUsd + OBSERVED_UNIT_COST_USD > maxCost + 1e-9) {
        throw new Error(`runtime cost guard would exceed max ${maxCost.toFixed(3)}`);
      }
      const result = await provider.measurePoint({
        keyword: campaign.keyword,
        latitude: point.latitude,
        longitude: point.longitude,
        agencyId: campaign.agencyId,
      });
      const cost = Number(result.cost || 0);
      actualCostUsd += Number.isFinite(cost) ? cost : 0;
      if (actualCostUsd > maxCost + 1e-9) {
        throw new Error(`actual cost ${actualCostUsd.toFixed(6)} exceeded max ${maxCost.toFixed(3)}`);
      }
      results.push({
        row: point.row,
        col: point.col,
        found: result.found === true,
        position: result.position == null ? null : Number(result.position),
        noSearchResults: result.providerMetadata?.noSearchResults === true,
        cost: Number.isFinite(cost) ? cost : 0,
      });
    }

    const found = results.filter((r) => r.found);
    const averagePosition = found.length
      ? Math.round((found.reduce((sum, r) => sum + r.position, 0) / found.length) * 100) / 100
      : null;
    const mask = Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 5 }, (_, col) => {
        const r = results.find((item) => item.row === row && item.col === col);
        return r?.found ? "F" : "-";
      }).join("")
    ).join("/");

    console.log(JSON.stringify({
      phase: "result",
      campaignId,
      agency: agency.name,
      city: campaign.city,
      keyword: campaign.keyword,
      zoom,
      providerCalls: results.length,
      actualCostUsd: Math.round(actualCostUsd * 1000000) / 1000000,
      found: found.length,
      presenceRate: Math.round((found.length / results.length) * 1000) / 1000,
      top3: found.filter((r) => Number(r.position) <= 3).length,
      top10: found.filter((r) => Number(r.position) <= 10).length,
      averagePosition,
      noSearch: results.filter((r) => r.noSearchResults).length,
      mask,
      databaseWrites: 0,
      results,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[MSE-25.125S] ERROR: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  EXPECTED_ACK,
  DEFAULT_CAMPAIGN_ID,
  DEFAULT_ZOOM,
  MAX_CALLS,
  DEFAULT_MAX_COST_USD,
  parseZoom,
  loadCampaignContext,
  main,
};
