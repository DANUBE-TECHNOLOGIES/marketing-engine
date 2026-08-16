"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ContentFactoryRepository = require("../src/modules/content-factory/repository");
const { pageBlockData } = require("../src/modules/content-factory/repository");

test("content factory converts generated sections to Website Designer V2 blocks", () => {
  const block = pageBlockData({
    sectionType: "overview",
    displayOrder: 20,
    content: {
      title: "L'essentiel pour un week-end à Budapest",
      paragraphs: ["Un contenu réellement visible par le renderer public."],
    },
  });

  assert.equal(block.blockType, "overview");
  assert.equal(block.displayOrder, 20);
  assert.equal(block.status, "draft");
  assert.equal(block.visibleDesktop, true);
  assert.equal(block.visibleMobile, true);
  assert.equal(block.name, "L'essentiel pour un week-end à Budapest");
  assert.deepEqual(block.content.paragraphs, ["Un contenu réellement visible par le renderer public."]);
});

test("content factory persists legacy sections and V2 blocks atomically on replace", async () => {
  const calls = {
    legacy: [],
    deleteBlocks: [],
    createBlocks: [],
  };

  const tx = {
    agencySitePage: {
      findUnique: async () => ({ id: "page-1" }),
      upsert: async () => ({ id: "page-1" }),
    },
    agencySiteSection: {
      upsert: async (input) => {
        calls.legacy.push(input);
        return { id: `section-${calls.legacy.length}` };
      },
    },
    pageBlock: {
      deleteMany: async (input) => {
        calls.deleteBlocks.push(input);
        return { count: 2 };
      },
      createMany: async (input) => {
        calls.createBlocks.push(input);
        return { count: input.data.length };
      },
    },
  };

  const prisma = {
    $transaction: async (callback) => callback(tx),
  };

  const repository = new ContentFactoryRepository(prisma);
  const result = await repository.persist(
    { id: "site-1" },
    [
      {
        slug: "budapest-weekend",
        parentSlug: null,
        title: "Week-end à Budapest",
        path: "/agence/ozoir/budapest-weekend",
        pageType: "destination-cluster",
        menuTitle: "Week-end à Budapest",
        menuLocation: "cluster",
        displayOrder: 20,
        seoTitle: "Week-end à Budapest | Mondescale Voyages",
        metaDescription: "Préparez votre week-end à Budapest.",
        h1: "Week-end à Budapest",
        schemaType: "Article",
        sections: [
          {
            sectionType: "hero",
            displayOrder: 10,
            content: { title: "Week-end à Budapest", introduction: "Introduction visible." },
          },
          {
            sectionType: "overview",
            displayOrder: 20,
            content: { title: "L'essentiel", paragraphs: ["Conseils pour préparer le séjour."] },
          },
        ],
      },
    ],
    true
  );

  assert.equal(result.persisted, 1);
  assert.equal(calls.legacy.length, 2, "legacy AgencySiteSection must remain populated");
  assert.deepEqual(calls.deleteBlocks, [{ where: { pageId: "page-1" } }]);
  assert.equal(calls.createBlocks.length, 1);
  assert.equal(calls.createBlocks[0].data.length, 2);
  assert.deepEqual(
    calls.createBlocks[0].data.map((entry) => entry.blockType),
    ["hero", "overview"]
  );
  assert.ok(calls.createBlocks[0].data.every((entry) => entry.pageId === "page-1"));
});
