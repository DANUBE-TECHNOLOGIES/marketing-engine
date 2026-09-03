"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { fetchCurrentPages, fetchCurrentPagesDirect } = require("../scripts/mse-25-40-write-intent");

function residualPlan() {
  return {
    sites: [{
      siteSlug: "gien",
      agencyId: 4,
      executablePages: [{ siteSlug: "gien", agencyId: 4, pageSlug: "services" }],
    }],
  };
}

function fakePrisma() {
  return {
    tenant: {
      findUnique: async ({ where }) => where.slug === "mondescale" ? { id: "tenant-1", slug: "mondescale" } : null,
    },
  };
}

function fakeService() {
  return {
    get: async (agencyId, pageSlug) => ({
      id: "page-1",
      title: "Nos services",
      slug: pageSlug,
      status: "published",
      published: true,
      blocks: [],
      agencyId,
    }),
  };
}

test("direct mode reads executable Website Designer pages without HTTP", async () => {
  const rows = await fetchCurrentPagesDirect(residualPlan(), {
    tenantSlug: "mondescale",
    prisma: fakePrisma(),
    service: fakeService(),
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].siteSlug, "gien");
  assert.equal(rows[0].agencyId, 4);
  assert.equal(rows[0].page.slug, "services");
});

test("fetchCurrentPages defaults to direct mode for MSE-25.40", async () => {
  const rows = await fetchCurrentPages(residualPlan(), {
    tenantSlug: "mondescale",
    mode: "direct",
    prisma: fakePrisma(),
    service: fakeService(),
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].page.title, "Nos services");
});

test("direct mode fails closed for an unknown tenant", async () => {
  await assert.rejects(
    () => fetchCurrentPagesDirect(residualPlan(), {
      tenantSlug: "unknown",
      prisma: fakePrisma(),
      service: fakeService(),
    }),
    (error) => error.code === "MSE_25_40_WRITE_INTENT_TENANT_NOT_FOUND"
  );
});
