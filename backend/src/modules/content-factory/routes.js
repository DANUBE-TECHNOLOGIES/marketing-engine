"use strict";
const express = require("express");
const Service = require("./service");
const { validateInput } = require("./validation");
module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new Service(prisma);
  router.get("/content-factory/health", (_req, res) => res.json({ ok: true, version: "1.0.0", capability: "autonomous-content-factory", modes: ["preview", "persist"] }));
  router.post("/content-factory/preview", async (req, res, next) => { try { res.json(await service.run(validateInput({ ...req.body, persist: false }))); } catch (e) { next(e); } });
  router.post("/content-factory/generate", async (req, res, next) => { try { const input = validateInput({ ...req.body, persist: true }); res.status(201).json(await service.run(input)); } catch (e) { next(e); } });
  return router;
};
