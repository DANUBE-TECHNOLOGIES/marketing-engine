"use strict";
const express = require("express");
const { AiSeoGeneratorService } = require("./service");
module.exports = () => {
  const router = express.Router();
  const service = new AiSeoGeneratorService();
  router.get("/ai-seo/health", (_req, res) => res.json(service.health()));
  router.post("/ai-seo/preview", async (req, res, next) => {
    try { res.json(await service.generate(req.body?.task, { campaign: req.body?.campaign })); }
    catch (error) { next(error); }
  });
  return router;
};
