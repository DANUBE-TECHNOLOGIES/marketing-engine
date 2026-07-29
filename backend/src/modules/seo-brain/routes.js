"use strict";
const express = require("express");
const { SeoBrainRepository } = require("./repository");
const { SeoBrainService } = require("./service");

module.exports = function createRoutes({ prisma }) {
  const router = express.Router();
  const service = new SeoBrainService(new SeoBrainRepository(prisma));
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  router.get("/seo-brain/health", wrap(async (_req, res) => res.json(await service.health())));
  router.post("/seo-brain/page/:id/analyze", wrap(async (req, res) => res.json(await service.analyzePage(req.params.id, req.body || {}))));
  router.post("/seo-brain/site/:id/analyze", wrap(async (req, res) => res.json(await service.analyzeSite(req.params.id, req.body || {}))));
  router.get("/seo-brain/roadmap", wrap(async (req, res) => res.json(await service.roadmap(req.query))));
  return router;
};
