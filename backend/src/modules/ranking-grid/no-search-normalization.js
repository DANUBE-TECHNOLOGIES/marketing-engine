"use strict";

const { summarizePoints } = require("./aggregate");

const NO_SEARCH_ERROR_CODE = "DATAFORSEO_TASK_40102";

async function normalizeNoSearchResults({ repository, tenantId, campaignId }) {
  const campaign = await repository.getCampaign({ tenantId, campaignId });
  if (!campaign) {
    const error = new Error("Ranking grid campaign not found");
    error.code = "RANKING_GRID_CAMPAIGN_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  const targets = (campaign.points || []).filter(
    (point) => point?.status === "error" && point?.errorCode === NO_SEARCH_ERROR_CODE,
  );

  for (const point of targets) {
    await repository.savePointResult({
      tenantId,
      campaignId,
      pointId: point.id,
      status: "success",
      result: {
        found: false,
        position: null,
        absolutePosition: null,
        cost: point.cost ?? null,
        providerMetadata: {
          provider: campaign.provider || "dataforseo-google-maps-live",
          noSearchResults: true,
          normalizedFromHistoricalError: true,
          historicalErrorCode: point.errorCode,
          historicalErrorMessage: point.errorMessage || null,
          historicalCostUnavailable: point.cost == null,
        },
      },
    });
  }

  const refreshed = await repository.getCampaign({ tenantId, campaignId });
  const summary = summarizePoints(refreshed.points || []);
  const status = summary.errorPoints === 0 ? "completed" : "partial";

  await repository.completeCampaign({
    tenantId,
    campaignId,
    status,
    summary,
  });

  const normalized = await repository.getCampaign({ tenantId, campaignId });
  return {
    campaign: normalized,
    normalizedPoints: targets.length,
    providerCalls: 0,
  };
}

module.exports = {
  NO_SEARCH_ERROR_CODE,
  normalizeNoSearchResults,
};
