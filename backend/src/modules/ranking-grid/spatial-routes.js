"use strict";

const express = require("express");
const { Prisma } = require("@prisma/client");
const { RankingGridRepository } = require("./repository");
const { methodologyMetadata } = require("./dataforseo-provider");
const { methodologyKey } = require("./service");
const { buildSpatialReport } = require("./spatial-analysis");

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

  router.get("/rankings/grid/spatial-audit", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
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

  return router;
};
