"use strict";

const express = require("express");
const { RankingGridRepository } = require("./repository");
const { normalizeNoSearchResults } = require("./no-search-normalization");

const EXPECTED_ACK = "NORMALIZE-NO-SEARCH-RESULTS";

function tenantSlugFrom(req) {
  return String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
}

module.exports = function createNoSearchRoutes({ prisma }) {
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

  router.post("/rankings/grid/campaigns/:campaignId/normalize-no-search-results", async (req, res, next) => {
    try {
      if (String(req.body?.ack || "") !== EXPECTED_ACK) {
        return res.status(400).json({
          error: "ACK_REQUIRED",
          expectedAck: EXPECTED_ACK,
        });
      }

      if (String(process.env.RANKING_GRID_DATAFORSEO_ENABLED || "false").toLowerCase() === "true") {
        return res.status(409).json({
          error: "PROVIDER_MUST_BE_DISABLED",
          message: "Disable DataForSEO before historical normalization",
        });
      }

      const campaignId = Number(req.params.campaignId);
      if (!Number.isInteger(campaignId) || campaignId <= 0) {
        return res.status(400).json({ error: "INVALID_CAMPAIGN_ID" });
      }

      const result = await normalizeNoSearchResults({
        repository,
        tenantId: await tenantId(req),
        campaignId,
      });

      return res.json({
        mode: "local_normalization",
        executionTriggered: false,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports.EXPECTED_ACK = EXPECTED_ACK;
