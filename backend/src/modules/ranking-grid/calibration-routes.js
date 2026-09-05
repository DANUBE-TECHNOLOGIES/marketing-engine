"use strict";

const express = require("express");
const { RankingGridRepository } = require("./repository");
const { buildCalibrationReport } = require("./calibration");

function tenantSlugFrom(req) {
  return String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
}

module.exports = function createCalibrationRoutes({ prisma }) {
  const router = express.Router();
  const repository = new RankingGridRepository(prisma);

  router.get("/rankings/grid/calibration-audit", async (req, res, next) => {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlugFrom(req) },
        select: { id: true },
      });
      if (!tenant) return res.status(404).json({ error: "tenant_not_found" });

      const campaigns = await repository.listCampaigns({ tenantId: tenant.id, limit: 20 });
      return res.json(buildCalibrationReport(campaigns));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
