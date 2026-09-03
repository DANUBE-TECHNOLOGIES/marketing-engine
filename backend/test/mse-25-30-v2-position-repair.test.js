"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ContentFactoryV2PositionRepair,
  duplicatePositions,
  fingerprint,
  proposedBlocks,
} = require("../src/modules/content-factory/v2-position-repair");

test("MSE-25.30 detects duplicated V2 positions deterministically", () => {
  const blocks = [
    { id: "a", blockType: "hero", displayOrder: 0 },
    { id: "b", blockType: "rich_text", displayOrder: 0 },
    { id: "c", blockType: "cta", displayOrder: 20 },
  ];
  assert.deepEqual(duplicatePositions(blocks), [{ position: 0, count: 2 }]);
  assert.deepEqual(proposedBlocks(blocks).map((item) => item.nextPosition), [0, 10, 20]);
  assert.equal(fingerprint(blocks), JSON.stringify([["a", 0], ["b", 0], ["c", 20]]));
});

test("MSE-25.30 position repair preview targets only pages with duplicate positions", async () => {
  const prisma = {
    agencySite: {
      findUnique: async () => ({
        id: "site-1",
        slug: "ambassade-fram-mondescale-ozoir-la-ferriere",
        name: "Ozoir",
        pages: [
          {
            id: "avis-id",
            slug: "avis",
            title: "Avis",
            status: "published",
            published: true,
            seoTitle: "Avis",
            metaDescription: "Avis",
            blocks: [
              { id: "a", blockType: "hero", displayOrder: 0, status: "published" },
              { id: "b", blockType: "cta", displayOrder: 0, status: "published" },
            ],
          },
          {
            id: "contact-id",
            slug: "contact",
            title: "Contact",
            status: "published",
            published: true,
            seoTitle: "Contact",
            metaDescription: "Contact",
            blocks: [
              { id: "c", blockType: "hero", displayOrder: 0, status: "published" },
              { id: "d", blockType: "agency", displayOrder: 10, status: "published" },
            ],
          },
        ],
      }),
    },
  };

  const repair = new ContentFactoryV2PositionRepair(prisma);
  const preview = await repair.plan({
    tenantId: "tenant_mondescale",
    siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere",
    pageSlugs: ["avis", "contact"],
  });

  assert.equal(preview.pagesScanned, 2);
  assert.equal(preview.candidateCount, 1);
  assert.equal(preview.candidates[0].slug, "avis");
  assert.deepEqual(preview.candidates[0].blocks.map((item) => item.nextPosition), [0, 10]);
});
