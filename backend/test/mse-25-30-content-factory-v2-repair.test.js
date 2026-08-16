"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validatePagePayload } = require("../src/modules/page-builder-persistence/validation");
const {
  ContentFactoryV2Repair,
  eligiblePage,
  exactLegacyCopy,
  repairBlockData,
  repairMode,
} = require("../src/modules/content-factory/v2-repair");

test("V2 repair targets empty destination pages and exact legacy copies only", () => {
  const base = {
    slug: "budapest-weekend",
    pageType: "destination-cluster",
    sections: [
      { id: "s1", sectionType: "hero", displayOrder: 10 },
      { id: "s2", sectionType: "overview", displayOrder: 20 },
    ],
    blocks: [],
  };
  assert.equal(repairMode(base, "budapest"), "create");
  assert.equal(eligiblePage(base, "budapest"), true);

  const legacyCopy = {
    ...base,
    blocks: [
      { id: "b1", blockType: "hero", displayOrder: 10 },
      { id: "b2", blockType: "overview", displayOrder: 20 },
    ],
  };
  assert.equal(exactLegacyCopy(legacyCopy), true);
  assert.equal(repairMode(legacyCopy, "budapest"), "normalize");
  assert.equal(eligiblePage(legacyCopy, "budapest"), true);

  assert.equal(eligiblePage({ ...legacyCopy, blocks: [{ id: "manual", blockType: "rich_text", displayOrder: 10 }] }, "budapest"), false);
  assert.equal(eligiblePage({ ...base, sections: [] }, "budapest"), false);
  assert.equal(eligiblePage({ ...base, slug: "rome-weekend" }, "budapest"), false);
  assert.equal(eligiblePage({ ...base, pageType: "generic" }, "budapest"), false);
});

test("V2 repair adapts legacy section contracts to registered Page Builder V2 blocks", () => {
  const page = { status: "published", published: true };
  const sections = [
    {
      sectionType: "hero",
      displayOrder: 10,
      jsonContent: { eyebrow: "Hongrie", title: "Week-end à Budapest", introduction: "Introduction", imageUrl: null },
    },
    {
      sectionType: "overview",
      displayOrder: 20,
      jsonContent: { title: "L'essentiel", paragraphs: ["Premier paragraphe", "Deuxième paragraphe"] },
    },
    {
      sectionType: "highlights",
      displayOrder: 30,
      jsonContent: { title: "Les incontournables", items: [{ title: "Le Parlement" }] },
    },
    {
      sectionType: "practical",
      displayOrder: 40,
      jsonContent: { title: "Informations pratiques", bestTime: "printemps", idealDuration: "3 jours", currency: "forint", language: "hongrois" },
    },
    {
      sectionType: "faq",
      displayOrder: 50,
      jsonContent: { title: "FAQ Budapest", items: [{ question: "Quand partir ?", answer: "Au printemps." }] },
    },
    {
      sectionType: "cta",
      displayOrder: 90,
      jsonContent: { title: "Construisons votre voyage", text: "Votre conseiller vous accompagne.", action: "Demander un devis" },
    },
  ];

  const blocks = sections.map((section) => repairBlockData(section, page));
  assert.deepEqual(blocks.map((block) => block.blockType), ["hero", "rich_text", "features", "rich_text", "faq", "cta"]);
  assert.ok(blocks.every((block) => block.status === "published"));
  assert.match(blocks[1].content.html, /Premier paragraphe/);
  assert.equal(blocks[5].content.primaryCta.label, "Demander un devis");
  assert.equal(blocks[5].content.primaryCta.href, "#contact");

  const validated = validatePagePayload({
    page: {
      title: "Week-end à Budapest",
      slug: "budapest-weekend",
      status: "published",
      published: true,
      seoTitle: "Week-end à Budapest",
      metaDescription: "Préparez votre week-end à Budapest.",
    },
    blocks: blocks.map((block) => ({
      type: block.blockType,
      status: block.status,
      position: block.displayOrder,
      content: block.content,
      settings: block.settings,
      seo: block.seo,
    })),
  });
  assert.equal(validated.blocks.length, 6);
});

test("V2 repair requires tenant scope", async () => {
  const repair = new ContentFactoryV2Repair({ agencySite: { findUnique: async () => null } });
  await assert.rejects(
    () => repair.plan({ siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere" }),
    (error) => error.code === "CONTENT_FACTORY_V2_REPAIR_TENANT_REQUIRED"
  );
});

test("V2 repair creates missing blocks and remains idempotent", async () => {
  const page = {
    id: "page-1",
    slug: "budapest-weekend",
    title: "Week-end à Budapest",
    pageType: "destination-cluster",
    status: "published",
    published: true,
    sections: [
      { id: "section-1", sectionType: "hero", jsonContent: { title: "Week-end à Budapest", introduction: "Introduction" }, displayOrder: 10, status: "published" },
      { id: "section-2", sectionType: "overview", jsonContent: { title: "L'essentiel", paragraphs: ["Conseils pratiques"] }, displayOrder: 20, status: "published" },
    ],
    blocks: [],
  };

  let currentBlocks = [];
  const createdPayloads = [];
  const lookupPayloads = [];
  const prisma = {
    agencySite: {
      findUnique: async (input) => {
        lookupPayloads.push(input);
        return { id: "site-1", slug: "ambassade-fram-mondescale-ozoir-la-ferriere", name: "Ozoir", pages: [{ ...page, blocks: currentBlocks }] };
      },
    },
    $transaction: async (callback) => callback({
      pageBlock: {
        findMany: async () => currentBlocks,
        deleteMany: async () => { currentBlocks = []; return { count: 0 }; },
        createMany: async ({ data }) => {
          createdPayloads.push(data);
          currentBlocks = data.map((entry, index) => ({ id: `b${index + 1}`, blockType: entry.blockType, displayOrder: entry.displayOrder }));
          return { count: data.length };
        },
      },
    }),
  };

  const repair = new ContentFactoryV2Repair(prisma);
  const common = { tenantId: "tenant-mondescale", siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere", destinationSlug: "budapest" };
  const preview = await repair.plan(common);

  assert.equal(preview.candidateCount, 1);
  assert.equal(preview.createCandidateCount, 1);
  assert.equal(preview.normalizeCandidateCount, 0);
  assert.deepEqual(lookupPayloads[0].where, { tenantId_slug: { tenantId: "tenant-mondescale", slug: "ambassade-fram-mondescale-ozoir-la-ferriere" } });

  const applied = await repair.apply({ ...common, confirm: true });
  assert.equal(applied.repairedPages, 1);
  assert.equal(applied.normalizedPages, 0);
  assert.equal(applied.createdBlocks, 2);
  assert.ok(createdPayloads[0].every((entry) => entry.status === "published"));

  const secondApply = await repair.apply({ ...common, confirm: true });
  assert.equal(secondApply.repairedPages, 0);
  assert.equal(secondApply.createdBlocks, 0);
});

test("V2 repair normalizes only an unchanged exact legacy copy", async () => {
  const sections = [
    { id: "s1", sectionType: "hero", jsonContent: { title: "Week-end à Budapest", introduction: "Introduction" }, displayOrder: 10, status: "published" },
    { id: "s2", sectionType: "overview", jsonContent: { title: "L'essentiel", paragraphs: ["Conseils pratiques"] }, displayOrder: 20, status: "published" },
  ];
  let currentBlocks = [
    { id: "b1", blockType: "hero", displayOrder: 10, status: "published" },
    { id: "b2", blockType: "overview", displayOrder: 20, status: "published" },
  ];
  let deleteCount = 0;
  const prisma = {
    agencySite: {
      findUnique: async () => ({
        id: "site-1",
        slug: "ambassade-fram-mondescale-ozoir-la-ferriere",
        name: "Ozoir",
        pages: [{ id: "page-1", slug: "budapest-weekend", title: "Week-end à Budapest", pageType: "destination-cluster", status: "published", published: true, sections, blocks: currentBlocks }],
      }),
    },
    $transaction: async (callback) => callback({
      pageBlock: {
        findMany: async () => currentBlocks,
        deleteMany: async () => { deleteCount += 1; currentBlocks = []; return { count: 2 }; },
        createMany: async ({ data }) => {
          currentBlocks = data.map((entry, index) => ({ id: `n${index + 1}`, blockType: entry.blockType, displayOrder: entry.displayOrder }));
          return { count: data.length };
        },
      },
    }),
  };

  const repair = new ContentFactoryV2Repair(prisma);
  const common = { tenantId: "tenant-mondescale", siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere", destinationSlug: "budapest" };
  const preview = await repair.plan(common);
  assert.equal(preview.normalizeCandidateCount, 1);

  const applied = await repair.apply({ ...common, confirm: true });
  assert.equal(applied.repairedPages, 1);
  assert.equal(applied.normalizedPages, 1);
  assert.equal(deleteCount, 1);
  assert.deepEqual(currentBlocks.map((block) => block.blockType), ["hero", "rich_text"]);
});
