"use strict";

const { validateBrandInput } = require("./validation");

function themeFromBrand(brand, tenant = {}) {
  const source = brand || {};
  return {
    tenant: { id: tenant.id || source.tenantId || null, slug: tenant.slug || null },
    brand: {
      displayName: source.displayName || tenant.name || "Marque",
      logoUrl: source.logoUrl || null,
      logoDarkUrl: source.logoDarkUrl || null,
      faviconUrl: source.faviconUrl || null,
      domain: source.domain || null,
    },
    colors: {
      primary: source.primaryColor || "#0B5FFF",
      secondary: source.secondaryColor || "#102A43",
      accent: source.accentColor || "#FFB703",
      background: source.backgroundColor || "#FFFFFF",
      text: source.textColor || "#102A43",
    },
    typography: { fontFamily: source.fontFamily || "Inter, Arial, sans-serif" },
    cssVariables: {
      "--brand-primary": source.primaryColor || "#0B5FFF",
      "--brand-secondary": source.secondaryColor || "#102A43",
      "--brand-accent": source.accentColor || "#FFB703",
      "--brand-background": source.backgroundColor || "#FFFFFF",
      "--brand-text": source.textColor || "#102A43",
      "--brand-font-family": source.fontFamily || "Inter, Arial, sans-serif",
    },
  };
}

class BrandService {
  constructor(repository) { this.repository = repository; }

  health() { return { ok: true, version: "1.0.0", capability: "white-label-foundation" }; }

  async get(tenant) {
    const brand = await this.repository.findByTenantId(tenant.id);
    return brand || { tenantId: tenant.id, displayName: tenant.name, ...validateBrandInput({ displayName: tenant.name }) };
  }

  async update(tenant, input) {
    const current = await this.repository.findByTenantId(tenant.id);
    return this.repository.upsert(tenant.id, validateBrandInput(input, current || { displayName: tenant.name }));
  }

  async theme(tenant) {
    const brand = await this.repository.findByTenantId(tenant.id);
    return themeFromBrand(brand, tenant);
  }

  async publicTheme(tenantSlug) {
    const brand = await this.repository.findPublicByTenantSlug(String(tenantSlug || "").trim().toLowerCase());
    if (!brand) throw Object.assign(new Error("Marque publique introuvable"), { statusCode: 404 });
    return themeFromBrand(brand, brand.tenant);
  }
}

module.exports = { BrandService, themeFromBrand };
