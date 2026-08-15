"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { optimizePageContent } = require("../src/modules/minisite-seo-enrichment/content-optimizer");

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

test("does not invent local content when agency city is unavailable", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale" },
    page: { slug: "home", title: "Accueil" },
    blocks: [{ blockType: "hero", content: { title: "Accueil", subtitle: "" } }],
  });

  assert.equal(result.blocks[0].content.subtitle, "");
});
