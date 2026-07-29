"use strict";

const express = require("express");
const { TenantRepository } = require("./repository");
const { TenantService } = require("./service");
const { createTenantMiddleware } = require("./middleware");

module.exports = function createRoutes({ prisma }) {
  const router = express.Router();
  const service = new TenantService(new TenantRepository(prisma));
  const requireTenant = createTenantMiddleware(service);
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  router.get("/tenant-core/health", (_req, res) => res.json(service.health()));
  router.post("/tenants", wrap(async (req, res) => res.status(201).json(await service.create(req.body || {}))));
  router.get("/tenants", wrap(async (req, res) => res.json(await service.list(req.query || {}))));
  router.get("/tenant/current", requireTenant, (req, res) => res.json(req.tenant));
  router.get("/tenant/agencies", requireTenant, wrap(async (req, res) => res.json(await service.listAgencies(req.tenant.id))));
  router.put("/tenant/agencies/:agencyId", requireTenant, wrap(async (req, res) => res.json(await service.attachAgency(req.tenant.id, req.params.agencyId))));

  return router;
};
