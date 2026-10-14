"use strict";
const express = require("express");
const { createAdminService } = require("./admin-service");

/**
 * This router must be mounted only with an authorization middleware which
 * authenticates the user AND enforces FRAM network administration permission.
 * Tenant resolution alone is not authorization.
 */
module.exports = function createFramAdminRoutes({ prisma, authorize }) {
  if (typeof authorize !== "function") throw new TypeError("Explicit FRAM administrator authorization required");
  const router = express.Router();
  const service = createAdminService(prisma);
  router.use(authorize);
  router.use((req, res, next) => {
    if (!req.tenantId || !req.user || req.user.role !== "admin" || req.framAdminAuthenticated !== true) return res.status(403).json({ error: "Administrator context required" });
    next();
  });
  const audit = (action, target, req) => {
    try {
      console.info(JSON.stringify({ event: "fram_admin_mutation", action, target: String(target), tenantId: req.tenantId, actorType: req.user?.authType || "unknown", at: new Date().toISOString() }));
    } catch (error) {
      // An already committed mutation must not be reported as failed because logging failed.
      try { console.error("FRAM audit logging unavailable", error?.message); } catch { /* logging unavailable */ }
    }
  };
  const handle = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (error) {
      if (error instanceof RangeError || error instanceof TypeError) return res.status(400).json({ error: error.message });
      console.error("FRAM administration failed", error?.message);
      return res.status(503).json({ error: "Administration unavailable" });
    }
  };
  router.get("/admin/ambassade-fram/offers", handle(async (_req, res) => res.json(await service.listOffers())));
  router.post("/admin/ambassade-fram/offers", handle(async (req, res) => res.status(201).json(await service.createOffer(req.body))));
  router.put("/admin/ambassade-fram/offers/:id/draft", handle(async (req, res) => res.json(await service.replaceDraft(req.params.id, req.body))));
  router.post("/admin/ambassade-fram/offers/:id/publish", handle(async (req, res) => res.json(await service.publishOffer(req.params.id).then(result => { audit("publish_offer", req.params.id, req); return result; }))));
  router.get("/admin/ambassade-fram/agencies", handle(async (req, res) => res.json(await service.listAgencies(req.tenantId))));
  router.post("/admin/ambassade-fram/agencies/:agencyId/approve", handle(async (req, res) => res.json(await service.approveAgency(req.tenantId, Number(req.params.agencyId)).then(result => { audit("approve_agency", req.params.agencyId, req); return result; }))));
  router.post("/admin/ambassade-fram/agencies/:agencyId/disable", handle(async (req, res) => res.json(await service.disableAgency(req.tenantId, Number(req.params.agencyId)).then(result => { audit("disable_agency", req.params.agencyId, req); return result; }))));
  router.post("/admin/ambassade-fram/offers/:id/archive", handle(async (req, res) => res.json(await service.archiveOffer(req.params.id).then(result => { audit("archive_offer", req.params.id, req); return result; }))));
  return router;
};
