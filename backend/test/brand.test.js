"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateBrandInput } = require("../src/modules/brand/validation");
const { BrandService, themeFromBrand } = require("../src/modules/brand/service");

const tenant = { id: "tenant-1", slug: "demo", name: "Réseau Démo" };

test("valide et normalise une marque", () => {
  const brand = validateBrandInput({
    displayName: " Réseau Démo ",
    primaryColor: "#abcdef",
    domain: "https://demo.example.com/",
    socialLinks: { facebook: "https://facebook.com/demo" },
  });
  assert.equal(brand.displayName, "Réseau Démo");
  assert.equal(brand.primaryColor, "#ABCDEF");
  assert.equal(brand.domain, "demo.example.com");
});

test("refuse une couleur invalide", () => {
  assert.throws(() => validateBrandInput({ displayName: "Demo", primaryColor: "blue" }), /hexadécimale/);
});

test("refuse un domaine invalide", () => {
  assert.throws(() => validateBrandInput({ displayName: "Demo", domain: "localhost" }), /Domaine/);
});

test("construit un thème avec variables CSS", () => {
  const theme = themeFromBrand({ displayName: "Demo", primaryColor: "#112233", fontFamily: "Arial" }, tenant);
  assert.equal(theme.brand.displayName, "Demo");
  assert.equal(theme.cssVariables["--brand-primary"], "#112233");
  assert.equal(theme.typography.fontFamily, "Arial");
});

test("retourne une marque par défaut quand elle n'existe pas", async () => {
  const service = new BrandService({ findByTenantId: async () => null });
  const brand = await service.get(tenant);
  assert.equal(brand.tenantId, tenant.id);
  assert.equal(brand.displayName, tenant.name);
});

test("met à jour uniquement la marque du tenant courant", async () => {
  let received;
  const service = new BrandService({
    findByTenantId: async () => null,
    upsert: async (tenantId, data) => { received = { tenantId, data }; return received; },
  });
  await service.update(tenant, { displayName: "Nouvelle marque", accentColor: "#123456" });
  assert.equal(received.tenantId, tenant.id);
  assert.equal(received.data.displayName, "Nouvelle marque");
  assert.equal(received.data.accentColor, "#123456");
});

test("le health expose la capacité white label", () => {
  assert.equal(new BrandService({}).health().capability, "white-label-foundation");
});
