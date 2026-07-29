"use strict";
const express = require("express");
const { SeoAutopilotRepository } = require("./repository");
const { SeoAutopilotExecutor } = require("./executor");
const { SeoAutopilotService } = require("./service");

module.exports = function createRoutes({ prisma, autopilotHandlers = {} }) {
  const router = express.Router();
  const service = new SeoAutopilotService(new SeoAutopilotRepository(prisma), new SeoAutopilotExecutor({ handlers: autopilotHandlers }));
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  router.get("/seo-autopilot/health", wrap(async (_req, res) => res.json(await service.health())));
  router.post("/seo-autopilot/runs", wrap(async (req, res) => res.status(201).json(await service.createRun(req.body || {}))));
  router.post("/seo-autopilot/runs/:id/execute", wrap(async (req, res) => res.json(await service.executeRun(req.params.id, req.body || {}))));
  router.get("/seo-autopilot/runs/:id", wrap(async (req, res) => {
    const run = await service.getRun(req.params.id);
    if (!run) return res.status(404).json({ error: "Exécution Autopilot introuvable" });
    return res.json(run);
  }));
  router.get("/seo-autopilot/runs", wrap(async (req, res) => res.json(await service.listRuns(req.query))));
  return router;
};
