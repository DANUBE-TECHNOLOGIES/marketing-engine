"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const DestinationService = require("../src/modules/destination-engine/service");

test("MSE-25.30 exposes only published Website Designer pages to destination rendering", async () => {
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
      pages: [
        { id: 1, slug: "croisieres", title: "Croisières", pageType: "content", status: "published", published: true },
        { id: 2, slug: "circuits", title: "Circuits", pageType: "content", status: "published", published: true },
        { id: 3, slug: "sejours", title: "Séjours", pageType: "content", status: "draft", published: false },
      ],
    }),
  };
  service.publicRepo = {
    findPublishedForTenant: async () => ({ id: "destination-1", slug: "sicile", name: "Sicile", status: "published" }),
  };
  service.exposureResolver = { exposes: async () => true };

  const result = await service.publicForSite("gien", "sicile", "tenant-1");
  assert.deepEqual(result.site.pages.map((page) => page.slug), ["croisieres", "circuits"]);
  assert.equal(result.canonicalPath, "/agence/gien/destination/sicile");
});
