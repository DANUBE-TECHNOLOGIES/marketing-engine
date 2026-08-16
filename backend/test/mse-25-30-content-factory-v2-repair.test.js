"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ContentFactoryV2Repair,
  eligiblePage,
  repairBlockData,
} = require("../src/modules/content-factory/v2-repair");

test("V2 repair targets only destination pages with legacy sections and no blocks", () => {
  const base = {
    slug: "budapest-weekend",
    pageType: "destination-cluster",
    sections: [{ id: "s1" }],
    blocks: [],
  };
  assert.equal(eligiblePage(base, "budapest"), true);
  assert.equal(eligiblePage({ ...base, blocks: [{ id: "b1" }] }, "budapest"), false);
  assert.equal(eligiblePage({ ...base, sections: [] }, "budapest"), false);
  assert.equal(eligiblePage({ ...base, slug: "rome-weekend" }, "budapest"), false);
  assert.equal(eligiblePage({ ...base, pageType: "generic" }, "budapest"), false);
});

test("V2 repair publishes copied blocks when the page is already published", () => {
  const block = repairBlockData({
    sectionType: "overview",
    displayOrder: 20,
    status: "draft",
    jsonContent: { title: "Week-end à Budapest", paragraphs: ["Texte visible"] },
  }, {
    status: "published",
    published: true,
  });

  assert.equal(block.blockType, "overview");
  assert.equal(block.status, "published");
  assert.deepEqual(block.content.paragraphs, ["Texte visible"]);
});

test("V2 repair preview and apply preserve page metadata and are idempotent", async () => {
  const page = {
    id: "page-1",
    slug: "budapest-weekend",
    title: "Week-end à Budapest",
    pageType: "destination-cluster",
    status: "published",
    published: true,
    sections: [
      {
        id: "section-1",
        sectionType: "hero",
        jsonContent: { title: "Week-end à Budapest", introduction: "Introduction" },
        displayOrder: 10,
        status: "published",
      },
      {
        id: "section-2",
        sectionType: "overview",
        jsonContent: { title: "L'essentiel", paragraphs: ["Conseils pratiques"] },
        displayOrder: 20,
        status: "published",
      },
    ],
    blocks: [],
  };

  let blockCount = 0;
  const createdPayloads = [];
  const prisma = {
    agencySite: {
      findUnique: async () => ({
        id: "site-1",
        slug: "ambassade-fram-mondescale-ozoir-la-ferriere",
        name: "Ozoir",
        pages: [page],
      }),
    },
    $transaction: async (callback) => callback({
      pageBlock: {
        count: async () => blockCount,
        createMany: async ({ data }) => {
          createdPayloads.push(data);
          blockCount += data.length;
          return { count: data.length };
        },
      },
    }),
  };

  const repair = new ContentFactoryV2Repair(prisma);
  const preview = await repair.plan({
    siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere",
    destinationSlug: "budapest",
  });

  assert.equal(preview.candidateCount, 1);
  assert.equal(preview.blockCount, 2);
  assert.equal(preview.candidates[0].published, true);

  await assert.rejects(
    () => repair.apply({
      siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere",
      destinationSlug: "budapest",
    }),
    (error) => error.code === "CONTENT_FACTORY_V2_REPAIR_CONFIRM_REQUIRED"
  );

  const applied = await repair.apply({
    siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere",
    destinationSlug: "budapest",
    confirm: true,
  });

  assert.equal(applied.repairedPages, 1);
  assert.equal(applied.createdBlocks, 2);
  assert.equal(createdPayloads.length, 1);
  assert.ok(createdPayloads[0].every((entry) => entry.pageId === "page-1"));
  assert.ok(createdPayloads[0].every((entry) => entry.status === "published"));

  const secondApply = await repair.apply({
    siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere",
    destinationSlug: "budapest",
    confirm: true,
  });
  assert.equal(secondApply.repairedPages, 0);
  assert.equal(secondApply.createdBlocks, 0);
});
