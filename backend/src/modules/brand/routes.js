"use strict";

const express = require("express");
const { TenantRepository } = require("../tenant-core/repository");
const { TenantService } = require("../tenant-core/service");
const { createTenantMiddleware } = require("../tenant-core/middleware");
const { BrandRepository } = require("./repository");
const { BrandService } = require("./service");

module.exports = function createBrandRoutes({ prisma }) {
  const router = express.Router();
  const service = new BrandService(new BrandRepository(prisma));
  const requireTenant = createTenantMiddleware(new TenantService(new TenantRepository(prisma)));
  const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

  router.get("/brand/health", (_req, res) => res.json(service.health()));
  router.get("/brand", requireTenant, wrap(async (req, res) => res.json(await service.get(req.tenant))));
  router.put("/brand", requireTenant, wrap(async (req, res) => res.json(await service.update(req.tenant, req.body || {}))));
  router.get("/brand/theme", requireTenant, wrap(async (req, res) => res.json(await service.theme(req.tenant))));
  router.get("/public/brands/:tenantSlug/theme", wrap(async (req, res) => res.json(await service.publicTheme(req.params.tenantSlug))));

  return router;
};
