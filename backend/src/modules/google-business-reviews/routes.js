"use strict";

const express = require("express");
const GoogleBusinessReviewsRepository = require("./repository");
const GoogleBusinessReviewsProvider = require("./provider");
const { GoogleBusinessReviewsService } = require("./service");

function tenantSlugFrom(req) {
  return String(req.headers["x-tenant-slug"] || "mondescale")
    .trim()
    .toLowerCase();
}

module.exports = function createGoogleBusinessReviewsRoutes({ prisma, provider }) {
  const router = express.Router();
  const repository = new GoogleBusinessReviewsRepository(prisma);
  const googleProvider = provider || new GoogleBusinessReviewsProvider(prisma);
  const service = new GoogleBusinessReviewsService(repository, googleProvider);

  // Registered before the historical inline route in server.js. This keeps the
  // public contract stable while moving MSE-25.124 to an isolated module.
  router.post("/google/import-reviews", async (req, res, next) => {
    try {
      const result = await service.syncTenant(tenantSlugFrom(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Public rendering reads the local GoogleReview snapshot only: no Google API
  // request is ever made on this path.
  router.get("/public/agency-sites/:siteSlug/reviews", async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
      const result = await service.getPublic(
        req.params.siteSlug,
        tenantSlugFrom(req),
        limit
      );

      res.set(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=1800"
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
