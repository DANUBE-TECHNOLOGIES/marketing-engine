"use strict";
const express = require("express");
const { SeoBrainRepository } = require("./repository");
const { SeoBrainService } = require("./service");

module.exports = function createRoutes({ prisma }) {
  const router = express.Router();
  const serviceFor = (req) => new SeoBrainService(new SeoBrainRepository(prisma, req.tenantId));
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  router.get("/seo-brain/health", wrap(async (req, res) => res.json(await serviceFor(req).health())));
  router.post("/seo-brain/page/:id/analyze", wrap(async (req, res) => res.json(await serviceFor(req).analyzePage(req.params.id, req.body || {}))));
  router.post("/seo-brain/site/:id/analyze", wrap(async (req, res) => res.json(await serviceFor(req).analyzeSite(req.params.id, req.body || {}))));
  router.post("/seo-brain/site/:id/plan", wrap(async (req, res) => res.json(await serviceFor(req).agencyPlan(req.params.id, req.body || {}))));
  router.get("/seo-brain/roadmap", wrap(async (req, res) => res.json(await serviceFor(req).roadmap(req.query))));
  return router;
};
