"use strict";
const express = require("express");
const Service = require("./service");
const { ContentFactoryV2Repair } = require("./v2-repair");
const { validateInput } = require("./validation");

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new Service(prisma);
  const v2Repair = new ContentFactoryV2Repair(prisma);

  router.get("/content-factory/health", (_req, res) => res.json({
    ok: true,
    version: "1.1.0",
    capability: "autonomous-content-factory",
    modes: ["preview", "persist"],
    v2Repair: true,
  }));

  router.post("/content-factory/preview", async (req, res, next) => {
    try {
      res.json(await service.run(validateInput({ ...req.body, persist: false })));
    } catch (e) { next(e); }
  });

  router.post("/content-factory/generate", async (req, res, next) => {
    try {
      const input = validateInput({ ...req.body, persist: true });
      res.status(201).json(await service.run(input));
    } catch (e) { next(e); }
  });

  router.post("/content-factory/v2-repair/preview", async (req, res, next) => {
    try {
      res.json(await v2Repair.plan(req.body || {}));
    } catch (e) { next(e); }
  });

  router.post("/content-factory/v2-repair/apply", async (req, res, next) => {
    try {
      res.json(await v2Repair.apply(req.body || {}));
    } catch (e) { next(e); }
  });

  return router;
};
