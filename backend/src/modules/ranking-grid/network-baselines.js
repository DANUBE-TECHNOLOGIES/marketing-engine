"use strict";

const { campaignKey } = require("./service");

const DEFAULT_GRID_SIZE = 5;
const DEFAULT_SPACING_KM = 1;

async function prepareNetworkBaselines({
  tenantId,
  agencies,
  repository,
  service,
  methodology = service?.provider?.methodology || null,
  gridSize = DEFAULT_GRID_SIZE,
  spacingKm = DEFAULT_SPACING_KM,
}) {
  const rows = Array.isArray(agencies) ? agencies : [];
  const results = [];

  for (const agency of rows) {
    if (agency?.status !== "ready" || !agency?.center) {
      results.push({
        agencyId: Number(agency?.agencyId),
        agencyName: agency?.agencyName || null,
        city: agency?.city || null,
        status: "skipped",
        reason: "not_ready",
      });
      continue;
    }

    const keywords = Array.isArray(agency.activeKeywords)
      ? agency.activeKeywords
      : [];

    for (const keyword of keywords) {
      const input = {
        tenantId,
        agencyId: Number(agency.agencyId),
        keywordId: Number(keyword.id),
        centerLat: Number(agency.center.latitude),
        centerLng: Number(agency.center.longitude),
        gridSize: Number(gridSize),
        spacingKm: Number(spacingKm),
      };

      const key = campaignKey({ ...input, methodology });
      const existing = await repository.findCampaignByKey({ tenantId, key });
      if (existing) {
        results.push({
          agencyId: Number(agency.agencyId),
          agencyName: agency.agencyName || null,
          city: agency.city || null,
          keywordId: Number(keyword.id),
          keyword: keyword.keyword,
          campaignId: Number(existing.id),
          status: "existing",
          campaignStatus: existing.status,
          points: Array.isArray(existing.points) ? existing.points.length : null,
          methodology,
          center: {
            latitude: Number(existing.centerLat),
            longitude: Number(existing.centerLng),
          },
        });
        continue;
      }

      const campaign = await service.createCampaign(input);
      results.push({
        agencyId: Number(agency.agencyId),
        agencyName: agency.agencyName || null,
        city: agency.city || null,
        keywordId: Number(keyword.id),
        keyword: keyword.keyword,
        campaignId: Number(campaign.id),
        status: "created",
        campaignStatus: campaign.status,
        points: Array.isArray(campaign.points) ? campaign.points.length : null,
        methodology,
        center: {
          latitude: Number(campaign.centerLat),
          longitude: Number(campaign.centerLng),
        },
      });
    }
  }

  return {
    methodology,
    summary: {
      created: results.filter((row) => row.status === "created").length,
      existing: results.filter((row) => row.status === "existing").length,
      skipped: results.filter((row) => row.status === "skipped").length,
      total: results.length,
    },
    baselines: results,
  };
}

module.exports = {
  DEFAULT_GRID_SIZE,
  DEFAULT_SPACING_KM,
  prepareNetworkBaselines,
};
