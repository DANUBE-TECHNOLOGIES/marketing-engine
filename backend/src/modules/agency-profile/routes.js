"use strict";

const express = require("express");
const AgencyProfileRepository = require("./repository");
const AgencyProfileService = require("./service");

module.exports = function createAgencyProfileRoutes({ prisma }) {
  const router = express.Router();
  const repository = new AgencyProfileRepository(prisma);
  const service = new AgencyProfileService(prisma, repository);

  router.post(
    "/agencies/:agencyId/profile/sync-google",
    async (req, res, next) => {
      try {
        res.json(await service.syncGoogleHours(req.params.agencyId));
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/public/agency-sites/:siteSlug/hours",
    async (req, res, next) => {
      try {
        const tenantSlug = String(
          req.headers["x-tenant-slug"] || "mondescale"
        ).trim().toLowerCase();

        res.set(
          "Cache-Control",
          "public, max-age=300, stale-while-revalidate=1800"
        );

        res.json(
          await service.publicHours(
            req.params.siteSlug,
            tenantSlug
          )
        );
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
