"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { extractTenantSelector, tenantWhere } = require("../src/modules/tenant-core/context");
const { TenantService, validateTenantInput } = require("../src/modules/tenant-core/service");
const { createTenantMiddleware } = require("../src/modules/tenant-core/middleware");

test("extrait le tenant depuis x-tenant-id", () => {
  assert.deepEqual(extractTenantSelector({ headers: { "x-tenant-id": "tenant-1" } }), { id: "tenant-1" });
});

test("refuse deux sélecteurs tenant simultanés", () => {
  assert.throws(() => extractTenantSelector({ headers: { "x-tenant-id": "a", "x-tenant-slug": "b" } }), /pas les deux/);
});

test("tenantWhere impose toujours le tenant courant", () => {
  assert.deepEqual(tenantWhere({ tenant: { id: "tenant-1" } }, { status: "draft", tenantId: "malicious" }), { status: "draft", tenantId: "tenant-1" });
});

test("valide et normalise la création d'un tenant", () => {
  assert.deepEqual(validateTenantInput({ name: " Réseau Démo ", slug: "Reseau-Demo", settings: { locale: "fr-FR" } }), {
    name: "Réseau Démo",
    slug: "reseau-demo",
    status: "active",
    plan: "starter",
    settings: { locale: "fr-FR" },
  });
});

test("le service refuse un tenant inactif", async () => {
  const service = new TenantService({ findBySelector: async () => ({ id: "t1", status: "suspended" }) });
  await assert.rejects(() => service.resolve({ id: "t1" }), /inactif/);
});

test("le middleware attache tenant et tenantId à la requête", async () => {
  const middleware = createTenantMiddleware({ resolve: async () => ({ id: "t1", slug: "demo", status: "active" }) });
  const req = { headers: { "x-tenant-slug": "demo" } };
  await new Promise((resolve, reject) => middleware(req, {}, (error) => error ? reject(error) : resolve()));
  assert.equal(req.tenantId, "t1");
  assert.equal(req.tenant.slug, "demo");
});

test("health décrit les sélecteurs supportés", () => {
  const service = new TenantService({});
  assert.equal(service.health().capability, "multi-tenant-foundation");
  assert.deepEqual(service.health().selectors, ["x-tenant-id", "x-tenant-slug"]);
});
