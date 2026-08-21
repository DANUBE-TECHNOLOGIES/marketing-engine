"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { MiniSiteSemanticEngineService } = require("../src/modules/minisite-semantic-engine/service");

function prismaFixture() {
  return {
    tenant: {
      findUnique: async ({ where }) => where.slug === "mondescale" ? { id: "tenant_mondescale", slug: "mondescale" } : null,
    },
    agencySite: {
      findUnique: async ({ where }) => ({ tenantId: where.id === "site-4" ? "tenant_mondescale" : "tenant_other" }),
      findMany: async ({ where }) => where.tenantId === "tenant_mondescale" ? [{ id: "site-4" }] : [],
    },
  };
}

test("tenant filter keeps only AgencySite rows belonging to requested tenant", async () => {
  const service = new MiniSiteSemanticEngineService({ prisma: prismaFixture(), repository: {} });
  const sites = [{ id: "site-4" }, { id: "site-9" }];
  const filtered = await service.filterSitesForTenant(sites, "mondescale");
  assert.deepEqual(filtered, [{ id: "site-4" }]);
});

test("agency scope fails closed when the site belongs to another tenant", async () => {
  const service = new MiniSiteSemanticEngineService({ prisma: prismaFixture(), repository: {} });
  await assert.rejects(
    () => service.assertTenantScope({ id: "site-9" }, "mondescale"),
    { code: "MSE_25_40_TENANT_SCOPE_MISMATCH" }
  );
});

test("unknown tenant is rejected instead of falling back to network-wide data", async () => {
  const service = new MiniSiteSemanticEngineService({ prisma: prismaFixture(), repository: {} });
  await assert.rejects(
    () => service.filterSitesForTenant([{ id: "site-4" }], "unknown"),
    { code: "MSE_25_40_TENANT_NOT_FOUND" }
  );
});
