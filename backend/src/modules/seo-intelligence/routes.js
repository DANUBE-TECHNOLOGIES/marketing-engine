"use strict";
const express = require("express");
const SeoIntelligenceService = require("./service");
module.exports = ({ prisma }) => {
  const router = express.Router(); const service = new SeoIntelligenceService(prisma);
  router.get("/seo/health", (_req, res) => res.json({ ok: true, version: "1.0.0", capability: "seo-intelligence-engine" }));
  router.post("/seo/analyze/page/:id", async (req, res, next) => { try { res.json(await service.analyzePage(req.params.id)); } catch (error) { next(error); } });
  router.post("/seo/analyze/site/:id", async (req, res, next) => { try { res.json(await service.analyzeSite(req.params.id)); } catch (error) { next(error); } });
  router.get("/seo/report/:id", async (req, res, next) => { try { res.json(await service.report(req.params.id)); } catch (error) { next(error); } });
  return router;
};
