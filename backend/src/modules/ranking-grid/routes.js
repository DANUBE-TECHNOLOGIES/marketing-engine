"use strict";

const express = require("express");
const { RankingGridRepository } = require("./repository");
const { RankingGridService } = require("./service");
const { UnconfiguredRankingGridProvider } = require("./provider");

function tenantSlugFrom(req) {
  return String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
}

module.exports = function createRankingGridRoutes({ prisma, provider }) {
  const router = express.Router();
  const repository = new RankingGridRepository(prisma);
  const rankingProvider = provider || new UnconfiguredRankingGridProvider();
  const service = new RankingGridService({ repository, provider: rankingProvider });

  async function tenantId(req) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlugFrom(req) },
      select: { id: true },
    });
    if (!tenant) {
      const error = new Error("Tenant not found");
      error.status = 404;
      throw error;
    }
    return tenant.id;
  }

  router.post("/rankings/grid/campaigns", async (req, res, next) => {
    try {
      const campaign = await service.createCampaign({
        tenantId: await tenantId(req),
        agencyId: Number(req.body?.agencyId),
        keywordId: Number(req.body?.keywordId),
        centerLat: Number(req.body?.centerLat),
        centerLng: Number(req.body?.centerLng),
        gridSize: req.body?.gridSize == null ? 5 : Number(req.body.gridSize),
        spacingKm: req.body?.spacingKm == null ? 1 : Number(req.body.spacingKm),
      });
      res.status(201).json(campaign);
    } catch (error) {
      if (error.code === "RANKING_GRID_SCOPE_NOT_FOUND") error.status = 404;
      next(error);
    }
  });

  router.get("/rankings/grid/campaigns/:campaignId", async (req, res, next) => {
    try {
      const campaign = await repository.getCampaign({
        tenantId: await tenantId(req),
        campaignId: Number(req.params.campaignId),
      });
      if (!campaign) return res.status(404).json({ error: "ranking_grid_campaign_not_found" });
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  });

  router.post("/rankings/grid/campaigns/:campaignId/run", async (req, res, next) => {
    try {
      if (rankingProvider.name === "unconfigured") {
        return res.status(503).json({ error: "ranking_grid_provider_unconfigured" });
      }
      const campaign = await service.runCampaign({
        tenantId: await tenantId(req),
        campaignId: Number(req.params.campaignId),
      });
      res.json(campaign);
    } catch (error) {
      if (error.code === "RANKING_GRID_CAMPAIGN_NOT_FOUND") error.status = 404;
      next(error);
    }
  });

  return router;
};
