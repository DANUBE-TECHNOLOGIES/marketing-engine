"use strict";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateTenantInput(input = {}) {
  const name = String(input.name || "").trim();
  const slug = String(input.slug || "").trim().toLowerCase();
  if (name.length < 2 || name.length > 120) throw Object.assign(new Error("Nom de tenant invalide"), { statusCode: 400 });
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) throw Object.assign(new Error("Slug de tenant invalide"), { statusCode: 400 });
  return {
    name,
    slug,
    status: input.status || "active",
    plan: input.plan || "starter",
    settings: input.settings || {},
  };
}

class TenantService {
  constructor(repository) {
    this.repository = repository;
  }

  health() {
    return {
      ok: true,
      version: "1.0.0",
      capability: "multi-tenant-foundation",
      selectors: ["x-tenant-id", "x-tenant-slug"],
    };
  }

  async resolve(selector) {
    if (!selector) throw Object.assign(new Error("En-tête tenant manquant"), { statusCode: 400, code: "TENANT_REQUIRED" });
    const tenant = await this.repository.findBySelector(selector);
    if (!tenant) throw Object.assign(new Error("Tenant introuvable"), { statusCode: 404, code: "TENANT_NOT_FOUND" });
    if (tenant.status !== "active") throw Object.assign(new Error("Tenant inactif"), { statusCode: 403, code: "TENANT_INACTIVE" });
    return tenant;
  }

  create(input) {
    return this.repository.create(validateTenantInput(input));
  }

  list(query) {
    return this.repository.list(query);
  }

  listAgencies(tenantId) {
    return this.repository.listAgencies(tenantId);
  }

  attachAgency(tenantId, agencyId) {
    if (!Number.isInteger(Number(agencyId)) || Number(agencyId) < 1) {
      throw Object.assign(new Error("Identifiant agence invalide"), { statusCode: 400 });
    }
    return this.repository.attachAgency(tenantId, agencyId);
  }
}

module.exports = { TenantService, validateTenantInput };
