"use strict";

const express = require("express");
const { createKnowledgeService } = require("../lib/knowledge/service");
const { validateKnowledgePayload } = require("../lib/knowledge/validators");

module.exports = function createDestinationKnowledgeRoutes(prisma) {
  const router = express.Router();
  const service = createKnowledgeService(prisma);

  router.get("/knowledge/health", (_req, res) => {
    res.json({ ok: true, version: "1.0.0", capability: "travel-knowledge-engine" });
  });

  router.get("/knowledge/destination/:slug", async (req, res, next) => {
    try {
      const destination = await service.getDestinationKnowledge(req.params.slug);
      if (!destination) return res.status(404).json({ error: { code: "DESTINATION_NOT_FOUND", message: "Destination introuvable." } });
      res.json({ ok: true, destination });
    } catch (error) { next(error); }
  });

  router.post("/knowledge/validate", (req, res) => {
    const validation = validateKnowledgePayload(req.body);
    res.status(validation.valid ? 200 : 400).json({ ok: validation.valid, ...validation });
  });

  router.put("/knowledge/destination/:slug", async (req, res, next) => {
    try {
      const destination = await service.upsertDestinationKnowledge({ ...req.body, destinationSlug: req.params.slug }, { partial: true });
      res.json({ ok: true, destination });
    } catch (error) { next(error); }
  });

  router.post("/knowledge/import", async (req, res, next) => {
    try {
      const items = Array.isArray(req.body) ? req.body : req.body.items;
      const report = await service.importMany(items, { continueOnError: req.body.continueOnError !== false });
      res.status(report.failed ? 207 : 200).json({ ok: report.failed === 0, report });
    } catch (error) { next(error); }
  });

  return router;
};
