"use strict";

const express = require("express");
const { RankingGridRepository } = require("./repository");
const { RankingGridService } = require("./service");
const { UnconfiguredRankingGridProvider } = require("./provider");
const { prepareNetworkBaselines } = require("./network-baselines");
const rankingGridRoutes = require("./routes");

const NETWORK_BASELINE_ACK = "CREATE-NETWORK-BASELINES";

function tenantSlugFrom(req) {
  return String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
}

module.exports = function createRankingGridBaselineRoutes({ prisma }) {
  const router = express.Router();
  const repository = new RankingGridRepository(prisma);
  const service = new RankingGridService({
    repository,
    provider: new UnconfiguredRankingGridProvider(),
  });

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

  router.post("/rankings/grid/baselines/prepare", async (req, res, next) => {
    try {
      if (String(req.body?.ack || "") !== NETWORK_BASELINE_ACK) {
        return res.status(400).json({
          error: "ranking_grid_network_baseline_ack_required",
          requiredAck: NETWORK_BASELINE_ACK,
        });
      }

      if (rankingGridRoutes.gridProviderEnabled()) {
        return res.status(409).json({
          error: "ranking_grid_network_baseline_requires_provider_off",
          hint: "Set RANKING_GRID_DATAFORSEO_ENABLED=false before creating network baselines",
        });
      }

      const scope = await tenantId(req);
      const loaded = await rankingGridRoutes.loadRolloutAgencies(prisma, scope);
      const audited = rankingGridRoutes.auditRolloutAgencies(loaded);
      const blocked = audited.filter((agency) => agency.status !== "ready");

      if (blocked.length) {
        return res.status(409).json({
          error: "ranking_grid_network_baseline_not_ready",
          blocked: blocked.map((agency) => ({
            agencyId: agency.agencyId,
            city: agency.city,
            blockers: agency.blockers,
          })),
        });
      }

      const result = await prepareNetworkBaselines({
        tenantId: scope,
        agencies: audited,
        repository,
        service,
        gridSize: 5,
        spacingKm: 1,
      });

      res.json({
        gridSize: 5,
        spacingKm: 1,
        providerCalls: 0,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports.NETWORK_BASELINE_ACK = NETWORK_BASELINE_ACK;
