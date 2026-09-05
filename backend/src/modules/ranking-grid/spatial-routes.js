"use strict";

const express = require("express");
const { Prisma } = require("@prisma/client");
const { RankingGridRepository } = require("./repository");
const { methodologyMetadata } = require("./dataforseo-provider");
const { methodologyKey } = require("./service");
const { buildSpatialReport } = require("./spatial-analysis");
const { analyzeGeoPriorities } = require("./geo-priority");

function tenantSlugFrom(req) {
  return String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
}

module.exports = function createRankingGridSpatialRoutes({ prisma }) {
  const router = express.Router();
  const repository = new RankingGridRepository(prisma);

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

  async function latestCalibratedCampaignRows(scope) {
    const methodology = methodologyMetadata();
    const key = methodologyKey(methodology);
    const suffix = `%:method:${key}`;

    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT DISTINCT ON (c."agencyId", c."keywordId")
        c.id,
        c."agencyId",
        c."keywordId"
      FROM "RankingGridCampaign" c
      INNER JOIN "Agency" a ON a.id = c."agencyId"
      WHERE a."tenantId" = ${scope}
        AND c."key" LIKE ${suffix}
        AND c."status" = 'completed'
      ORDER BY
        c."agencyId" ASC,
        c."keywordId" ASC,
        c."createdAt" DESC,
        c.id DESC
    `);

    return { methodology, key, rows };
  }

  router.get("/rankings/grid/spatial-audit", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const { methodology, key, rows } = await latestCalibratedCampaignRows(scope);

      const campaigns = [];
      for (const row of rows) {
        const campaign = await repository.getCampaign({
          tenantId: scope,
          campaignId: Number(row.id),
        });
        if (campaign) campaigns.push(campaign);
      }

      res.json({
        methodology,
        methodologyKey: key,
        ...buildSpatialReport(campaigns),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/spatial-priorities", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const requestedCampaignId = Number(req.query?.campaignId);
      const { methodology, key, rows } = await latestCalibratedCampaignRows(scope);
      const selected = Number.isInteger(requestedCampaignId) && requestedCampaignId > 0
        ? rows.filter((row) => Number(row.id) === requestedCampaignId)
        : rows;

      if (Number.isInteger(requestedCampaignId) && requestedCampaignId > 0 && !selected.length) {
        return res.status(404).json({ error: "ranking_grid_calibrated_campaign_not_found" });
      }

      const campaigns = [];
      for (const row of selected) {
        const campaign = await repository.getCampaign({
          tenantId: scope,
          campaignId: Number(row.id),
        });
        if (campaign) campaigns.push(campaign);
      }

      const priorities = campaigns.map(analyzeGeoPriorities)
        .sort((a, b) => b.summary.p1 - a.summary.p1 || b.summary.p2 - a.summary.p2 || a.city.localeCompare(b.city));

      res.json({
        mode: "read_only",
        providerCalls: 0,
        executionTriggered: false,
        methodology,
        methodologyKey: key,
        summary: {
          campaigns: priorities.length,
          p1: priorities.reduce((sum, row) => sum + row.summary.p1, 0),
          p2: priorities.reduce((sum, row) => sum + row.summary.p2, 0),
          p3: priorities.reduce((sum, row) => sum + row.summary.p3, 0),
          actionableCells: priorities.reduce((sum, row) => sum + row.summary.actionableCells, 0),
        },
        campaigns: priorities,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
