"use strict";

const TENANT_ID_HEADER = "x-tenant-id";
const TENANT_SLUG_HEADER = "x-tenant-slug";

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) return value[0] || null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function extractTenantSelector(req = {}) {
  const headers = req.headers || {};
  const tenantId = normalizeHeaderValue(headers[TENANT_ID_HEADER]);
  const tenantSlug = normalizeHeaderValue(headers[TENANT_SLUG_HEADER]);

  if (tenantId && tenantSlug) {
    const error = new Error("Utilisez x-tenant-id ou x-tenant-slug, pas les deux");
    error.statusCode = 400;
    error.code = "TENANT_SELECTOR_CONFLICT";
    throw error;
  }

  if (tenantId) return { id: tenantId };
  if (tenantSlug) return { slug: tenantSlug.toLowerCase() };
  return null;
}

function requireTenantContext(req) {
  if (!req || !req.tenant || !req.tenant.id) {
    const error = new Error("Contexte tenant requis");
    error.statusCode = 400;
    error.code = "TENANT_CONTEXT_REQUIRED";
    throw error;
  }
  return req.tenant;
}

function tenantWhere(req, where = {}) {
  const tenant = requireTenantContext(req);
  return { ...where, tenantId: tenant.id };
}

module.exports = {
  TENANT_ID_HEADER,
  TENANT_SLUG_HEADER,
  extractTenantSelector,
  requireTenantContext,
  tenantWhere,
};
