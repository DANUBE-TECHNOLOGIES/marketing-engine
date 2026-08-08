"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hydratePreviewPage,
} = require("../src/modules/public-site-read/preview-hydrator");

test("MSE-25.3 hydrate la preview V2 avec les données publiques du bon site", async () => {
  const prisma = {
    agencySite: {
      async findFirst(query) {
        assert.deepEqual(query.where, { slug: "bois-colombes" });
        return {
          id: "site-1",
          agencyId: 12,
          tenantId: "tenant-a",
          agency: { tenantId: "tenant-a" },
        };
      },
    },
    destination: {
      async findMany(query) {
        assert.equal(query.where.tenantId, "tenant-a");
        assert.equal(query.where.status, "published");
        return [
          {
            id: "dest-1",
            slug: "maurice",
            name: "Île Maurice",
            country: "Maurice",
            status: "published",
          },
        ];
      },
    },
    googleReview: {
      async findMany(query) {
        assert.equal(query.where.agencyId, 12);
        return [
          {
            id: 99,
            authorName: "Client test",
            rating: 5,
            comment: "Excellent accompagnement.",
          },
        ];
      },
    },
  };

  const result = await hydratePreviewPage({
    prisma,
    siteSlug: "Bois-Colombes",
    page: {
      id: "home",
      blocks: [
        {
          id: "destinations-1",
          type: "destinations",
          content: {
            destinationIds: ["dest-1"],
            limit: 6,
          },
        },
        {
          id: "reviews-1",
          type: "testimonials",
          content: {
            source: "google",
            limit: 3,
          },
        },
      ],
    },
  });

  assert.equal(result.context.tenantId, "tenant-a");
  assert.equal(result.context.agencyId, 12);
  assert.equal(
    result.page.blocks[0].content.destinations[0].slug,
    "maurice"
  );
  assert.equal(
    result.page.blocks[1].content.items[0].author,
    "Client test"
  );
});

test("MSE-25.3 refuse une preview pour un mini-site inconnu", async () => {
  const prisma = {
    agencySite: {
      async findFirst() {
        return null;
      },
    },
  };

  await assert.rejects(
    () =>
      hydratePreviewPage({
        prisma,
        siteSlug: "inconnu",
        page: { blocks: [] },
      }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, "PUBLIC_SITE_PREVIEW_NOT_FOUND");
      return true;
    }
  );
});
