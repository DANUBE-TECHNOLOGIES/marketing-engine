"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { scopedService } = require("../src/modules/minisite-seo-enrichment/routes");

test("MSE-25.30 scopes Website Designer persistence to the resolved request tenant", () => {
  const prisma = {};
  const service = scopedService({
    prisma,
    request: { tenantId: "tenant-mondescale", tenant: { id: "tenant-mondescale" } },
  });

  assert.equal(service.pageBuilderPersistenceService.tenantId, "tenant-mondescale");
  assert.equal(typeof service.structuredDataService.previewSitemap, "function");
});

test("MSE-25.30 refuses request-scoped operations without a resolved tenant", () => {
  assert.throws(
    () => scopedService({ prisma: {}, request: {} }),
    (error) => {
      assert.equal(error.code, "MINISITE_SEO_TENANT_REQUIRED");
      assert.equal(error.status, 400);
      return true;
    }
  );
});
