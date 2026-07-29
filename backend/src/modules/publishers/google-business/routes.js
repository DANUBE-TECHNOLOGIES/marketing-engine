const express = require("express");
const GoogleBusinessPublisherService = require("./service");

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new GoogleBusinessPublisherService(prisma);
  router.get("/publishers/google-business/health", (req, res) => res.json(service.health()));
  router.post("/publishers/google-business/preview", (req, res, next) => {
    try { res.json(service.preview(req.body || {})); } catch (error) { next(error); }
  });
  router.post("/publishers/google-business/publications/:id/publish", async (req, res, next) => {
    try { res.json(await service.publish(req.params.id, req.body || {})); } catch (error) { next(error); }
  });
  return router;
};
