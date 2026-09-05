"use strict";

const express = require("express");
const { loadPaidRolloutPlan } = require("./network-paid-plan");

function tenantSlugFrom(req) {
  return String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
}

module.exports = function createRankingGridPaidPlanRoutes({ prisma }) {
  const router = express.Router();

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

  router.get("/rankings/grid/paid-plan", async (req, res, next) => {
    try {
      const plan = await loadPaidRolloutPlan(
        prisma,
        await tenantId(req),
        {
          campaignIds: req.query?.campaignIds,
        },
      );

      res.json({
        mode: "read_only",
        providerCalls: 0,
        executionTriggered: false,
        ...plan,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
