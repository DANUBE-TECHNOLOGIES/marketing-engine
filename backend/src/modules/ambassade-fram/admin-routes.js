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
  const mutateWithAudit = async (method, args, action, target, req) => {
    if (typeof prisma.$transaction !== "function" || !prisma.framAdminAudit) {
      throw new Error("Transactional FRAM audit unavailable");
    }
    return prisma.$transaction(async tx => {
      const result = await createAdminService(tx)[method](...args);
      await tx.framAdminAudit.create({data:{
        action, target:String(target), tenantId:req.tenantId,
        actorType:req.user?.authType || "unknown"
      }});
      return result;
    });
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
  router.post("/admin/ambassade-fram/offers/:id/publish", handle(async (req, res) => res.json(await mutateWithAudit("publishOffer", [req.params.id], "publish_offer", req.params.id, req))));
  router.get("/admin/ambassade-fram/agencies", handle(async (req, res) => res.json(await service.listAgencies(req.tenantId))));
  router.post("/admin/ambassade-fram/agencies/:agencyId/approve", handle(async (req, res) => res.json(await mutateWithAudit("approveAgency", [req.tenantId, Number(req.params.agencyId)], "approve_agency", req.params.agencyId, req))));
  router.post("/admin/ambassade-fram/agencies/:agencyId/disable", handle(async (req, res) => res.json(await mutateWithAudit("disableAgency", [req.tenantId, Number(req.params.agencyId)], "disable_agency", req.params.agencyId, req))));
  router.post("/admin/ambassade-fram/offers/:id/archive", handle(async (req, res) => res.json(await mutateWithAudit("archiveOffer", [req.params.id], "archive_offer", req.params.id, req))));
  return router;
};
