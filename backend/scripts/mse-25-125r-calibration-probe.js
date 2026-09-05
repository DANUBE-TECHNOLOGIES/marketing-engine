"use strict";

const { PrismaClient } = require("@prisma/client");
const { RankingGridRepository } = require("../src/modules/ranking-grid/repository");
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

async function dataForSeoBalance({ login, password, fetchImpl = global.fetch } = {}) {
  if (!login || !password) throw new Error("DataForSEO credentials are not configured");
  const auth = Buffer.from(`${login}:${password}`, "utf8").toString("base64");
  const response = await fetchImpl("https://api.dataforseo.com/v3/appendix/user_data", {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) throw new Error(`DataForSEO balance preflight HTTP ${response.status}`);
  const payload = await response.json();
  const task = Array.isArray(payload?.tasks) ? payload.tasks[0] : null;
  const result = Array.isArray(task?.result) ? task.result[0] : null;
  const balance = Number(result?.money?.balance ?? result?.balance ?? NaN);
  if (!Number.isFinite(balance)) throw new Error("DataForSEO balance preflight returned no finite balance");
  return balance;
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

  const minBalance = Number(process.env.MSE_25_125R_MIN_BALANCE_USD || 0.10);
  if (!Number.isFinite(minBalance) || minBalance < 0) throw new Error("invalid minimum balance");
  const balance = await dataForSeoBalance({ login: process.env.DATAFORSEO_LOGIN, password: process.env.DATAFORSEO_PASSWORD });
  if (balance < minBalance + estimate) {
    throw new Error(`DataForSEO balance ${balance.toFixed(6)} is below required ${(minBalance + estimate).toFixed(6)}`);
  }

  const prisma = new PrismaClient();
  try {
    const tenantSlug = String(process.env.MSE_25_125R_TENANT_SLUG || "mondescale").trim().toLowerCase();
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) throw new Error(`tenant not found: ${tenantSlug}`);

    const repository = new RankingGridRepository(prisma);
    const campaign = await repository.getCampaign({ tenantId: tenant.id, campaignId });
    if (!campaign) throw new Error("campaign not found");
    if (Number(campaign.gridSize) !== 5) throw new Error("calibration probe requires a 5x5 campaign");

    const agency = await prisma.agency.findFirst({
      where: { id: Number(campaign.agencyId), tenantId: tenant.id },
      include: { profile: true },
    });
    if (!agency) throw new Error("campaign agency not found");

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
      balanceUsd: balance,
      historicalZoom15: historical,
    }));

    const results = [];
    let actualCostUsd = 0;
    for (const zoom of zooms) {
      const provider = new DataForSeoMapsRankingGridProvider({
        zoom,
        targetResolver: async () => target,
      });
      for (const base of historical) {
        if (actualCostUsd + OBSERVED_UNIT_COST_USD > maxCost + 1e-9) {
          throw new Error(`runtime cost guard would exceed max ${maxCost.toFixed(3)}`);
        }
        const result = await provider.measurePoint({
          keyword: campaign.keyword,
          latitude: base.latitude,
          longitude: base.longitude,
          agencyId: campaign.agencyId,
        });
        const cost = Number(result.cost || 0);
        actualCostUsd += Number.isFinite(cost) ? cost : 0;
        if (actualCostUsd > maxCost + 1e-9) {
          throw new Error(`actual cost ${actualCostUsd.toFixed(6)} exceeded max ${maxCost.toFixed(3)}`);
        }
        results.push({
          zoom,
          row: base.row,
          col: base.col,
          found: result.found === true,
          position: result.position == null ? null : Number(result.position),
          noSearchResults: result.providerMetadata?.noSearchResults === true,
          cost: Number.isFinite(cost) ? cost : 0,
        });
      }
    }

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

if (require.main === module) {
  main().catch((error) => {
    console.error(`[MSE-25.125R] ERROR: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  EXPECTED_ACK,
  SENTINEL_CELLS,
  DEFAULT_ZOOMS,
  MAX_CALLS,
  OBSERVED_UNIT_COST_USD,
  parseZooms,
  placeIdFromGoogleReviewUrl,
  dataForSeoBalance,
  main,
};
