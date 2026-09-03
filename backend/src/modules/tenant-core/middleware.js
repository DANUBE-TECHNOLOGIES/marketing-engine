"use strict";

const { extractTenantSelector } = require("./context");

function createTenantMiddleware(service, { optional = false, defaultSlug = process.env.DEFAULT_TENANT_SLUG || "mondescale" } = {}) {
  if (!service || typeof service.resolve !== "function") throw new Error("TenantService est requis");

  return async function tenantMiddleware(req, res, next) {
    try {
      const selector = extractTenantSelector(req);
      if (!selector && optional) return next();
      req.tenant = await service.resolve(selector || { slug: defaultSlug });
      req.tenantId = req.tenant.id;
      req.tenantSlug = req.tenant.slug;
      return next();
    } catch (error) {
      if (typeof next === "function") return next(error);
      const status = error.statusCode || 500;
      return res.status(status).json({ error: error.message, code: error.code || "TENANT_ERROR" });
    }
  };
}

module.exports = { createTenantMiddleware };
