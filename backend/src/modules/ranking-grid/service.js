"use strict";

const { generateGrid } = require("./grid");
const { summarizePoints } = require("./aggregate");

function campaignKey({ agencyId, keywordId, centerLat, centerLng, gridSize, spacingKm }) {
  return [agencyId, keywordId, Number(centerLat).toFixed(7), Number(centerLng).toFixed(7), gridSize, Number(spacingKm).toFixed(3)].join(":");
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

    const key = campaignKey({ agencyId, keywordId, centerLat, centerLng, gridSize, spacingKm });
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
  campaignKey,
};
