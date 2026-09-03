"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const DestinationService = require("./service");

function createService({ exposed = true } = {}) {
  const service = new DestinationService({});

  service.repo = {
    findPublicSite: async () => ({
      id: 10,
      tenantId: "tenant-1",
      agencyId: 42,
      slug: "gien",
      name: "Mondescale Gien",
      status: "published",
      agency: { id: 42, tenantId: "tenant-1", city: "Gien" },
    }),
  };

  service.publicRepo = {
    findPublishedForTenant: async () => ({
      id: "destination-1",
      slug: "sicile",
      name: "Sicile",
      status: "published",
    }),
  };

  service.exposureResolver = {
    exposes: async () => exposed,
  };

  return service;
}

test("returns the public landing when destination is exposed by the minisite", async () => {
  const service = createService({ exposed: true });
  const result = await service.publicForSite("gien", "sicile", "tenant-1");

  assert.equal(result.destination.slug, "sicile");
  assert.equal(result.canonicalPath, "/agence/gien/destination/sicile");
});

test("returns 404 when a published destination is not exposed by the minisite", async () => {
  const service = createService({ exposed: false });

  await assert.rejects(
    () => service.publicForSite("gien", "sicile", "tenant-1"),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, "PUBLIC_DESTINATION_NOT_EXPOSED");
      return true;
    }
  );
});
