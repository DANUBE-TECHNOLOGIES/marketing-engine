"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  optimizePageContent,
  buildLocalSectionTitle,
  buildLocalSectionText,
} = require("../src/modules/minisite-seo-enrichment/content-optimizer");

test("optimizes the public hero H1 and fills an empty local introduction", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale Lamorlaye", city: "Lamorlaye" },
    page: { slug: "home", title: "Accueil" },
    blocks: [{ id: 12, blockType: "hero", content: { title: "Découvrez votre prochaine destination", subtitle: "", imageUrl: "https://example.test/hero.jpg" } }],
  });

  assert.equal(result.changed, true);
  assert.equal(result.blocks[0].content.title, "Agence de voyages à Lamorlaye");
  assert.match(result.blocks[0].content.subtitle, /Lamorlaye/);
  assert.equal(result.blocks[0].content.imageUrl, "https://example.test/hero.jpg");
  assert.equal(result.changes.length, 2);
});

test("preserves an existing manual hero subtitle", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale Maurepas", city: "Maurepas" },
    page: { slug: "notre-agence", title: "Notre agence" },
    blocks: [{ id: 3, blockType: "hero", content: { title: "Notre agence", subtitle: "Texte éditorial validé manuellement." } }],
  });

  assert.equal(result.blocks[0].content.title, "Votre agence de voyages à Maurepas");
  assert.equal(result.blocks[0].content.subtitle, "Texte éditorial validé manuellement.");
  assert.equal(result.changes.length, 1);
});

test("optimizes commercial service pages around service plus city", () => {
  const cases = [
    ["croisieres", "Croisières", "Croisières à Gien"],
    ["circuits", "Circuits", "Circuits à Gien"],
    ["voyages-sur-mesure", "Voyages sur mesure", "Voyages sur mesure à Gien"],
    ["sejours", "Séjours", "Séjours à Gien"],
    ["billetterie-vols", "Billetterie et vols", "Billetterie et vols à Gien"],
  ];

  for (const [slug, title, expected] of cases) {
    const result = optimizePageContent({
      agency: { name: "Mondescale Gien", city: "Gien" },
      page: { slug, title },
      blocks: [{ blockType: "hero", content: { title, subtitle: "" } }],
    });
    assert.equal(result.blocks[0].content.title, expected);
    assert.match(result.blocks[0].content.subtitle, /Gien/);
  }
});

test("does not invent local content when agency city is unavailable", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale" },
    page: { slug: "home", title: "Accueil" },
    blocks: [{ blockType: "hero", content: { title: "Accueil", subtitle: "" } }],
  });

  assert.equal(result.blocks[0].content.subtitle, "");
});

test("fills an empty editorial H2 and local copy", () => {
  const agency = { name: "Mondescale Gien", city: "Gien" };
  const page = { slug: "croisieres", title: "Croisières" };
  const result = optimizePageContent({
    agency,
    page,
    blocks: [
      { id: "hero", blockType: "hero", content: { title: "Croisières", subtitle: "Introduction" } },
      { id: "editorial", blockType: "rich_text", content: {} },
    ],
  });

  assert.equal(result.blocks[1].content.title, buildLocalSectionTitle({ agency, page }));
  assert.equal(result.blocks[1].content.text, buildLocalSectionText({ agency, page }));
  assert.match(result.blocks[1].content.title, /croisières à Gien/i);
});

test("preserves an existing editorial H2 and paragraph", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale Gien", city: "Gien" },
    page: { slug: "circuits", title: "Circuits" },
    blocks: [
      { id: "hero", blockType: "hero", content: { title: "Circuits", subtitle: "Introduction manuelle" } },
      { id: "editorial", blockType: "rich_text", content: { title: "Notre sélection", text: "Texte rédigé par l'agence." } },
    ],
  });

  assert.equal(result.blocks[1].content.title, "Notre sélection");
  assert.equal(result.blocks[1].content.text, "Texte rédigé par l'agence.");
});

test("adds internal hrefs only when matching commercial pages exist", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale Gien", city: "Gien" },
    page: { slug: "accueil", title: "Accueil" },
    blocks: [
      { id: "hero", blockType: "hero", content: { title: "Accueil", subtitle: "Introduction" } },
      {
        id: "services",
        blockType: "services",
        content: {
          items: [
            { title: "Croisières", text: "Nos croisières" },
            { title: "Circuits", text: "Nos circuits" },
            { title: "Location de voiture", text: "Service annexe" },
          ],
        },
      },
    ],
    availablePages: [
      { slug: "accueil", title: "Accueil" },
      { slug: "croisieres", title: "Croisières" },
      { slug: "circuits", title: "Circuits" },
    ],
  });

  assert.equal(result.blocks[1].content.items[0].href, "croisieres");
  assert.equal(result.blocks[1].content.items[1].href, "circuits");
  assert.equal(result.blocks[1].content.items[2].href, undefined);
  assert.ok(result.changes.some((change) => change.field === "items.0.href"));
});
