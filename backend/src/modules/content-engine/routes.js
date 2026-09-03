"use strict";

const express = require("express");
const { listTemplates } = require("./templates");
const { createContentEngineService } = require("./service");

module.exports = function createContentEngineRoutes(prisma) {
  const router = express.Router();
  const service = createContentEngineService(prisma);

  router.get("/content-engine/health", (_req, res) => {
    res.json({ ok: true, version: "1.0.0", capability: "travel-content-engine" });
  });

  router.get("/content-engine/templates", (_req, res) => {
    res.json({ ok: true, items: listTemplates() });
  });

  router.post("/content-engine/preview", async (req, res, next) => {
    try {
      const content = await service.preview({
        slug: req.body?.destinationSlug || req.body?.slug,
        siteSlug: req.body?.siteSlug || null,
        template: req.body?.template || "destination",
        status: req.body?.status || "draft",
        recommendationLimit: req.body?.recommendationLimit || 8,
      });
      res.json({ ok: true, mode: "preview", content });
    } catch (error) { next(error); }
  });

  router.post("/content-engine/generate", async (req, res, next) => {
    try {
      const content = await service.preview({
        slug: req.body?.destinationSlug || req.body?.slug,
        siteSlug: req.body?.siteSlug || null,
        template: req.body?.template || "destination",
        status: req.body?.status || "draft",
        recommendationLimit: req.body?.recommendationLimit || 8,
      });
      res.json({ ok: true, generated: true, persisted: false, content });
    } catch (error) { next(error); }
  });

  return router;
};
