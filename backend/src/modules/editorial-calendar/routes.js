const express = require("express");
const EditorialCalendarService = require("./service");

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new EditorialCalendarService(prisma);
  router.get("/editorial-calendar/health", (req, res) => res.json({ ok: true, version: "1.0.0", capability: "intelligent-editorial-calendar" }));
  router.post("/editorial-calendar/preview", (req, res, next) => {
    try { res.json(service.preview(req.body || {})); } catch (error) { next(error); }
  });
  router.post("/editorial-calendar/generate", async (req, res, next) => {
    try { res.status(201).json(await service.generate(req.body || {})); } catch (error) { next(error); }
  });
  return router;
};
