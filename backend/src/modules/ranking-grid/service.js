"use strict";

const { generateGrid } = require("./grid");
const { summarizePoints } = require("./aggregate");

function methodologyKey(methodology) {
  if (!methodology || typeof methodology !== "object") return null;
  const version = String(methodology.version || "").trim();
  const zoom = Number(methodology.zoom);
  const depth = Number(methodology.depth);
  if (!version || !Number.isFinite(zoom) || !Number.isFinite(depth)) return null;
  return [
    version,
    `z${zoom}`,
    `d${depth}`,
    `sp${methodology.searchPlaces === true ? 1 : 0}`,
    `sta${methodology.searchThisArea === true ? 1 : 0}`,
  ].join(":");
}

function campaignKey({ agencyId, keywordId, centerLat, centerLng, gridSize, spacingKm, methodology }) {
  const parts = [
    agencyId,
    keywordId,
    Number(centerLat).toFixed(7),
    Number(centerLng).toFixed(7),
    gridSize,
    Number(spacingKm).toFixed(3),
  ];
  const methodKey = methodologyKey(methodology);
  if (methodKey) parts.push("method", methodKey);
  return parts.join(":");
}

function normalizeSnapshotDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const error = new Error("snapshotDate must use YYYY-MM-DD");
    error.code = "RANKING_GRID_SNAPSHOT_DATE_INVALID";
    throw error;
  }
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    const error = new Error("snapshotDate is not a valid calendar date");
    error.code = "RANKING_GRID_SNAPSHOT_DATE_INVALID";
    throw error;
  }
  return text;
}

function snapshotKey(campaign, snapshotDate, methodology) {
  const base = campaignKey({
    agencyId: campaign.agencyId,
    keywordId: campaign.keywordId,
    centerLat: campaign.centerLat,
    centerLng: campaign.centerLng,
    gridSize: campaign.gridSize,
    spacingKm: campaign.spacingKm,
    methodology,
  });
  return `${base}:snapshot:${normalizeSnapshotDate(snapshotDate)}`;
}

class RankingGridService {
  constructor({ repository, provider, concurrency = 3 }) {
    this.repository = repository;
    this.provider = provider;
    this.concurrency = Math.max(1, Math.min(5, Number(concurrency) || 3));
  }

  async createCampaign({ tenantId, agencyId, keywordId, centerLat, centerLng, gridSize = 5, spacingKm = 1 }) {
    const agencyKeyword = await this.repository.getAgencyKeyword({ tenantId, agencyId, keywordId });
    if (!agencyKeyword) {
      const error = new Error("Agency or ranking keyword not found for tenant");
      error.code = "RANKING_GRID_SCOPE_NOT_FOUND";
      throw error;
    }

    const key = campaignKey({
      agencyId,
      keywordId,
      centerLat,
      centerLng,
      gridSize,
      spacingKm,
      methodology: this.provider?.methodology,
    });
    const existing = await this.repository.findCampaignByKey({ tenantId, key });
    if (existing) return existing;

    const points = generateGrid({ centerLat, centerLng, gridSize, spacingKm });
    return this.repository.createCampaignWithPoints({
      tenantId,
      agencyId: Number(agencyId),
      keywordId: Number(keywordId),
      keyword: agencyKeyword.keyword,
      city: agencyKeyword.city,
      centerLat: Number(centerLat),
      centerLng: Number(centerLng),
      gridSize: Number(gridSize),
      spacingKm: Number(spacingKm),
      provider: this.provider.name,
      key,
      points,
    });
  }

  async createSnapshot({ tenantId, sourceCampaignId, snapshotDate }) {
    const source = await this.repository.getCampaign({ tenantId, campaignId: sourceCampaignId });
    if (!source) {
      const error = new Error("Ranking grid source campaign not found");
      error.code = "RANKING_GRID_CAMPAIGN_NOT_FOUND";
      throw error;
    }

    const date = normalizeSnapshotDate(snapshotDate);
    const key = snapshotKey(source, date, this.provider?.methodology);
    const existing = await this.repository.findCampaignByKey({ tenantId, key });
    if (existing) return existing;

    const points = (source.points || []).map((point) => ({
      row: Number(point.row),
      col: Number(point.col),
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      northKm: Number(point.northKm),
      eastKm: Number(point.eastKm),
    }));

    return this.repository.createCampaignWithPoints({
      tenantId,
      agencyId: Number(source.agencyId),
      keywordId: Number(source.keywordId),
      keyword: source.keyword,
      city: source.city,
      centerLat: Number(source.centerLat),
      centerLng: Number(source.centerLng),
      gridSize: Number(source.gridSize),
      spacingKm: Number(source.spacingKm),
      provider: this.provider.name,
      key,
      points,
    });
  }

  async runCampaign({ tenantId, campaignId }) {
    const campaign = await this.repository.getCampaign({ tenantId, campaignId });
    if (!campaign) {
      const error = new Error("Ranking grid campaign not found");
      error.code = "RANKING_GRID_CAMPAIGN_NOT_FOUND";
      throw error;
    }

    await this.repository.markCampaignRunning({
      tenantId,
      campaignId,
      provider: this.provider.name,
    });
    const pending = campaign.points.filter((point) => point.status !== "success");

    for (let offset = 0; offset < pending.length; offset += this.concurrency) {
      const batch = pending.slice(offset, offset + this.concurrency);
      await Promise.all(batch.map(async (point) => {
        try {
          const result = await this.provider.measurePoint({
            keyword: campaign.keyword,
            city: campaign.city,
            latitude: point.latitude,
            longitude: point.longitude,
            agencyId: campaign.agencyId,
          });
          await this.repository.savePointResult({
            tenantId,
            campaignId,
            pointId: point.id,
            status: "success",
            result,
          });
        } catch (error) {
          await this.repository.savePointResult({
            tenantId,
            campaignId,
            pointId: point.id,
            status: "error",
            result: { errorCode: error.code || null, errorMessage: error.message },
          });
        }
      }));
    }

    const refreshed = await this.repository.getCampaign({ tenantId, campaignId });
    const summary = summarizePoints(refreshed.points);
    const status = summary.errorPoints === 0 ? "completed" : "partial";
    await this.repository.completeCampaign({ tenantId, campaignId, status, summary });
    return this.repository.getCampaign({ tenantId, campaignId });
  }
}

module.exports = {
  RankingGridService,
  methodologyKey,
  campaignKey,
  normalizeSnapshotDate,
  snapshotKey,
};
