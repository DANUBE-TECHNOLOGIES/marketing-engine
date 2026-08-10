"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  normalizeDesignerSection,
  normalizePublicPage,
} = require("../src/modules/public-site-read/section-aware-service");

test("MSE-25.9 maps published Website Designer sections to public blocks", () => {
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
        jsonContent: {
          title: "Votre agence de voyages à Bois-Colombes",
        },
      },
    ],
    blocks: [
      {
        id: "legacy-hero",
        blockType: "hero",
        status: "published",
        displayOrder: 0,
        content: {
          title: "Ancien hero",
        },
      },
    ],
  });

  assert.equal(page.contentSource, "website-designer-sections");
  assert.equal(page.blocks.length, 1);
  assert.equal(page.blocks[0].id, "section-hero");
  assert.equal(page.blocks[0].type, "hero");
  assert.equal(
    page.blocks[0].content.title,
    "Votre agence de voyages à Bois-Colombes"
  );
});

test("MSE-25.9 never exposes draft Website Designer sections", () => {
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
        jsonContent: { title: "Brouillon" },
      },
    ],
    blocks: [],
  });

  assert.equal(page.blocks.length, 0);
  assert.equal(page.contentSource, "legacy-page-blocks");
});

test("MSE-25.9 normalizes Designer sections for the existing public renderer", () => {
  const block = normalizeDesignerSection({
    id: "section-reviews",
    sectionType: "reviews",
    status: "published",
    displayOrder: 6,
    jsonContent: { title: "Avis clients" },
  });

  assert.equal(block.blockType, "reviews");
  assert.equal(block.type, "reviews");
  assert.equal(block.content.title, "Avis clients");
  assert.equal(block.source, "agency-site-section");
});
