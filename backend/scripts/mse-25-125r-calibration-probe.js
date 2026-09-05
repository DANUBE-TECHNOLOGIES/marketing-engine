"use strict";

const { PrismaClient } = require("@prisma/client");
const { DataForSeoMapsRankingGridProvider } = require("../src/modules/ranking-grid/dataforseo-provider");

const EXPECTED_ACK = "RUN-RANKING-GRID-CALIBRATION-PROBE";
const SENTINEL_CELLS = [
  [0, 0], [0, 2], [0, 4],
  [2, 0], [2, 2], [2, 4],
  [4, 0], [4, 2], [4, 4],
];
const DEFAULT_ZOOMS = [14, 16];
const MAX_CALLS = 18;
const OBSERVED_UNIT_COST_USD = 0.002;

function parseZooms(value) {
  const source = String(value || "").trim();
  const zooms = source ? source.split(",").map((v) => Number(v.trim())) : DEFAULT_ZOOMS;
  if (!zooms.length || zooms.some((z) => !Number.isInteger(z) || z < 3 || z > 21)) {
    throw new Error("MSE_25_125R_ZOOMS must contain comma-separated integer zooms between 3 and 21");
  }
  if (new Set(zooms).size !== zooms.length) throw new Error("MSE_25_125R_ZOOMS must be unique");
  return zooms;
}

function placeIdFromGoogleReviewUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    for (const key of ["placeid", "place_id", "query_place_id"]) {
      const candidate = url.searchParams.get(key);
      if (candidate) return candidate.trim() || null;
    }
  } catch {}
  const match = raw.match(/[?&](?:placeid|place_id|query_place_id)=([^&#]+)/i);
  if (!match?.[1]) return null;
  try { return decodeURIComponent(match[1]).trim() || null; } catch { return match[1].trim() || null; }
}

async function main() {
  if (String(process.env.MSE_25_125R_PAID_ACK || "") !== EXPECTED_ACK) {
    throw new Error(`set MSE_25_125R_PAID_ACK=${EXPECTED_ACK}`);
  }
  if (String(process.env.RANKING_GRID_DATAFORSEO_ENABLED || "false").toLowerCase() !== "true") {
    throw new Error("provider must be explicitly enabled for the paid calibration probe");
  }

  const campaignId = Number(process.env.MSE_25_125R_CAMPAIGN_ID || 4);
  if (!Number.isInteger(campaignId) || campaignId <= 0) throw new Error("invalid campaign id");
  const zooms = parseZooms(process.env.MSE_25_125R_ZOOMS);
  const calls = SENTINEL_CELLS.length * zooms.length;
  if (calls > MAX_CALLS) throw new Error(`probe would issue ${calls} calls; hard cap is ${MAX_CALLS}`);

  const maxCost = Number(process.env.MSE_25_125R_MAX_COST_USD || 0.036);
  const estimate = calls * OBSERVED_UNIT_COST_USD;
  if (!Number.isFinite(maxCost) || maxCost <= 0) throw new Error("invalid max cost");
  if (estimate > maxCost + 1e-9) throw new Error(`estimated cost ${estimate.toFixed(3)} exceeds max ${maxCost.toFixed(3)}`);

  const prisma = new PrismaClient();
  try {
    const campaign = await prisma.rankingGridCampaign.findUnique({
      where: { id: campaignId },
      include: { points: true, agency: { include: { profile: true } } },
    });
    if (!campaign) throw new Error("campaign not found");
    if (Number(campaign.gridSize) !== 5) throw new Error("calibration probe requires a 5x5 campaign");

    const agency = campaign.agency;
    const googleData = agency?.profile?.googleLocationData && typeof agency.profile.googleLocationData === "object"
      ? agency.profile.googleLocationData
      : {};
    const target = {
      name: agency?.name || null,
      address: agency?.address || null,
      postalCode: agency?.postalCode || null,
      website: agency?.website || null,
      placeId: googleData.placeId || googleData.place_id || placeIdFromGoogleReviewUrl(agency?.googleReviewUrl),
      cid: googleData.cid || null,
    };
    if (!target.placeId && !target.cid && !target.name) throw new Error("agency target identity unavailable");

    const pointByCell = new Map(campaign.points.map((p) => [`${p.row}:${p.col}`, p]));
    const historical = SENTINEL_CELLS.map(([row, col]) => {
      const p = pointByCell.get(`${row}:${col}`);
      if (!p) throw new Error(`missing sentinel cell ${row}:${col}`);
      return { row, col, latitude: Number(p.latitude), longitude: Number(p.longitude), found: p.found === true, position: p.position == null ? null : Number(p.position) };
    });

    console.log(JSON.stringify({
      phase: "preflight",
      campaignId,
      city: campaign.city,
      keyword: campaign.keyword,
      zooms,
      sentinelCells: SENTINEL_CELLS,
      calls,
      estimatedCostUsd: estimate,
      maxCostUsd: maxCost,
      historicalZoom15: historical,
    }));

    const results = [];
    for (const zoom of zooms) {
      const provider = new DataForSeoMapsRankingGridProvider({
        zoom,
        targetResolver: async () => target,
      });
      for (const base of historical) {
        const result = await provider.measurePoint({
          keyword: campaign.keyword,
          latitude: base.latitude,
          longitude: base.longitude,
          agencyId: campaign.agencyId,
        });
        results.push({
          zoom,
          row: base.row,
          col: base.col,
          found: result.found === true,
          position: result.position == null ? null : Number(result.position),
          noSearchResults: result.providerMetadata?.noSearchResults === true,
          cost: Number(result.cost || 0),
        });
      }
    }

    const actualCostUsd = results.reduce((sum, r) => sum + (Number.isFinite(r.cost) ? r.cost : 0), 0);
    const byZoom = zooms.map((zoom) => {
      const subset = results.filter((r) => r.zoom === zoom);
      const found = subset.filter((r) => r.found);
      return {
        zoom,
        calls: subset.length,
        found: found.length,
        noSearch: subset.filter((r) => r.noSearchResults).length,
        averagePosition: found.length ? Math.round((found.reduce((s, r) => s + r.position, 0) / found.length) * 100) / 100 : null,
      };
    });

    console.log(JSON.stringify({
      phase: "result",
      campaignId,
      city: campaign.city,
      keyword: campaign.keyword,
      providerCalls: results.length,
      actualCostUsd: Math.round(actualCostUsd * 1000000) / 1000000,
      byZoom,
      results,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`[MSE-25.125R] ERROR: ${error.message}`);
  process.exit(1);
});
