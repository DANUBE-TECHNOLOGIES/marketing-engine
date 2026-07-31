"use strict";
const express = require("express");
const { SiteProvisioningService } = require("./service");

module.exports = ({ prisma }) => {
  const router = express.Router();
  const serviceFor = req => new SiteProvisioningService(prisma, req.tenantId);

  router.get("/provisioning/health", (req, res) => res.json(serviceFor(req).health()));
  router.get("/provisioning/mini-sites/status", async (req, res, next) => {
    try { res.json(await serviceFor(req).status()); } catch (error) { next(error); }
  });
  router.post("/provisioning/mini-sites/agencies/:id", async (req, res, next) => {
    try { res.status(201).json(await serviceFor(req).provisionAgency(req.params.id, req.body || {})); } catch (error) { next(error); }
  });
  router.post("/provisioning/mini-sites/batch", async (req, res, next) => {
    try { res.json(await serviceFor(req).provisionBatch(req.body || {})); } catch (error) { next(error); }
  });
  return router;
};
