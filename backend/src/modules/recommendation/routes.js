"use strict";

const express = require("express");
const { createRecommendationService } = require("./service");

function parseOptions(source = {}) {
  return {
    limit: source.limit,
    minScore: source.minScore,
    candidateLimit: source.candidateLimit,
    destinationLimit: source.destinationLimit,
    relationType: source.relationType,
    continueOnError: source.continueOnError,
    weights: source.weights,
  };
}

module.exports = function createRecommendationRoutes(prisma) {
  const router = express.Router();
  const service = createRecommendationService(prisma);

  router.get("/recommendations/health", (_req, res) => {
    res.json({ ok: true, version: "1.0.0", capability: "travel-recommendation-engine" });
  });

  router.get("/recommendations/destination/:slug", async (req, res, next) => {
    try {
      const result = await service.recommendBySlug(req.params.slug, parseOptions(req.query));
      res.json({ ok: true, ...result });
    } catch (error) { next(error); }
  });

  router.post("/recommendations/destination/:slug/rebuild", async (req, res, next) => {
    try {
      const result = await service.rebuildOne(req.params.slug, parseOptions(req.body || {}));
      res.json({ ok: true, ...result });
    } catch (error) { next(error); }
  });

  router.post("/recommendations/rebuild", async (req, res, next) => {
    try {
      const report = await service.rebuildAll(parseOptions(req.body || {}));
      res.status(report.failed ? 207 : 200).json({ ok: report.failed === 0, report });
    } catch (error) { next(error); }
  });

  return router;
};
