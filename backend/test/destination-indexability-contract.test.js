"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const DestinationService = require("../src/modules/destination-engine/service");
const {
  collectExposedDestinationSlugs,
} = require("../src/modules/public-site-read/destination-exposure");

test("destination exposure collector only returns resolved destination cards", () => {
  const slugs = collectExposedDestinationSlugs([
    {
      blocks: [
        {
          blockType: "destinations",
          content: {
            destinationIds: ["destination-1"],
            destinations: [{ slug: "sicile" }, { slug: "maldives" }],
          },
        },
        {
          blockType: "text",
          content: { items: [{ slug: "japon" }] },
        },
      ],
    },
    {
      blocks: [
        {
          blockType: "destinations",
          content: { items: [{ slug: "sicile" }, { slug: "crete" }] },
        },
      ],
    },
  ]);

  assert.deepEqual(slugs, ["sicile", "maldives", "crete"]);
});

function serviceWithExposure(exposed) {
  const service = new DestinationService({});
  service.repo = {
    findPublicSite: async () => ({
      id: 10,
      tenantId: "tenant-1",
      agencyId: 42,
      slug: "gien",
      name: "Mondescale Gien",
      status: "published",
      agency: { id: 42, tenantId: "tenant-1" },
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
  service.exposureResolver = { exposes: async () => exposed };
  return service;
}

test("public destination API accepts an exposed published destination", async () => {
  const result = await serviceWithExposure(true).publicForSite(
    "gien",
    "sicile",
    "tenant-1"
  );

  assert.equal(result.destination.slug, "sicile");
  assert.equal(result.canonicalPath, "/agence/gien/destination/sicile");
});

test("public destination API rejects a published but unexposed destination", async () => {
  await assert.rejects(
    () => serviceWithExposure(false).publicForSite("gien", "sicile", "tenant-1"),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, "PUBLIC_DESTINATION_NOT_EXPOSED");
      return true;
    }
  );
});
