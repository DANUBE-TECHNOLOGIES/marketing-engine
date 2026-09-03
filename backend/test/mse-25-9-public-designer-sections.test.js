"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  normalizeDesignerSection,
  normalizeV2Block,
  normalizePublicPage,
} = require("../src/modules/public-site-read/section-aware-service");

test("MSE-25.9 prefers published Website Designer V2 blocks over legacy sections", () => {
  const page = normalizePublicPage({
    id: "page-home",
    slug: "home",
    title: "Accueil",
    status: "published",
    published: true,
    sections: [
      {
        id: "section-hero",
        sectionType: "hero",
        status: "published",
        displayOrder: 0,
        jsonContent: { title: "Ancien hero structuré" },
      },
    ],
    blocks: [
      {
        id: "v2-hero",
        blockType: "hero",
        status: "published",
        displayOrder: 0,
        content: { title: "Hero Website Designer V2" },
        settings: { alignment: "left" },
      },
    ],
  });

  assert.equal(page.contentSource, "website-designer-v2-blocks");
  assert.equal(page.blocks.length, 1);
  assert.equal(page.blocks[0].id, "v2-hero");
  assert.equal(page.blocks[0].content.title, "Hero Website Designer V2");
  assert.equal(page.blocks[0].source, "page-block-v2");
});

test("MSE-25.9 falls back to published AgencySiteSection content before V2 migration", () => {
  const page = normalizePublicPage({
    id: "page-home",
    slug: "home",
    title: "Accueil",
    status: "published",
    published: true,
    sections: [
      {
        id: "section-hero",
        sectionType: "hero",
        status: "published",
        displayOrder: 0,
        jsonContent: { title: "Hero historique" },
      },
    ],
    blocks: [
      {
        id: "draft-v2-hero",
        blockType: "hero",
        status: "draft",
        displayOrder: 0,
        content: { title: "Pas encore publié" },
      },
    ],
  });

  assert.equal(page.contentSource, "agency-site-sections");
  assert.equal(page.blocks.length, 1);
  assert.equal(page.blocks[0].id, "section-hero");
  assert.equal(page.blocks[0].content.title, "Hero historique");
});

test("MSE-25.9 never exposes draft V2 blocks or draft legacy sections", () => {
  const page = normalizePublicPage({
    id: "page-home",
    slug: "home",
    title: "Accueil",
    status: "published",
    published: true,
    sections: [
      {
        id: "draft-section",
        sectionType: "hero",
        status: "draft",
        displayOrder: 0,
        jsonContent: { title: "Brouillon historique" },
      },
    ],
    blocks: [
      {
        id: "draft-block",
        blockType: "hero",
        status: "draft",
        displayOrder: 0,
        content: { title: "Brouillon V2" },
      },
    ],
  });

  assert.equal(page.blocks.length, 0);
  assert.equal(page.contentSource, "empty");
});

test("MSE-25.9 normalizes both persistence generations for the existing public renderer", () => {
  const section = normalizeDesignerSection({
    id: "section-reviews",
    sectionType: "reviews",
    status: "published",
    displayOrder: 6,
    jsonContent: { title: "Avis clients" },
  });

  const block = normalizeV2Block({
    id: "block-team",
    blockType: "team",
    status: "published",
    displayOrder: 4,
    content: { title: "Notre équipe" },
    settings: {},
    seo: {},
  });

  assert.equal(section.type, "reviews");
  assert.equal(section.source, "agency-site-section");
  assert.equal(block.type, "team");
  assert.equal(block.source, "page-block-v2");
});
