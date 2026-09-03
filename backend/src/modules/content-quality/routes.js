const express = require("express");
const ContentQualityService = require("./service");

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new ContentQualityService(prisma);

  router.get("/content-quality/health", (req, res) => res.json({ ok: true, version: "1.0.0", capability: "duplicate-and-cannibalization-engine" }));

  router.post("/content-quality/check-page/:id", async (req, res, next) => {
    try { res.json(await service.checkPage(req.params.id, req.body || {})); } catch (error) { next(error); }
  });

  router.post("/content-quality/check-page", async (req, res, next) => {
    try { res.json(await service.checkDraft(req.body || {}, req.body || {})); } catch (error) { next(error); }
  });

  router.post("/content-quality/check-site/:id", async (req, res, next) => {
    try { res.json(await service.checkSite(req.params.id, req.body || {})); } catch (error) { next(error); }
  });

  router.post("/content-quality/check-cluster", async (req, res, next) => {
    try { res.json(await service.checkCluster(req.body || {})); } catch (error) { next(error); }
  });

  return router;
};
