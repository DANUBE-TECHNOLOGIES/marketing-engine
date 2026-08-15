"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  optimizePageContent,
  buildLocalSectionTitle,
  buildLocalSectionText,
} = require("../src/modules/minisite-seo-enrichment/content-optimizer");
const { validatePagePayload } = require("../src/modules/page-builder-persistence/validation");

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

test("fills an empty editorial H2 and local copy with the native rich_text contract", () => {
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
  assert.match(result.blocks[1].content.html, /Gien/);
  assert.match(result.blocks[1].content.html, /<p>/);
  assert.match(buildLocalSectionText({ agency, page }), /Gien/);
});

test("preserves an existing editorial H2 and paragraph", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale Gien", city: "Gien" },
    page: { slug: "circuits", title: "Circuits" },
    blocks: [
      { id: "hero", blockType: "hero", content: { title: "Circuits", subtitle: "Introduction manuelle" } },
      { id: "editorial", blockType: "rich_text", content: { title: "Notre sélection", html: "<p>Texte rédigé par l'agence.</p>" } },
      { id: "proofs", blockType: "features", content: { title: "Nos engagements", introduction: "Texte manuel", items: [{ title: "Conseil", text: "Sur mesure" }], columns: 3 } },
      { id: "cta", blockType: "cta", content: { title: "Parlons de votre projet", text: "Texte manuel", primaryCta: { label: "Nous contacter", href: "#contact" }, secondaryCta: null, style: "primary" } },
    ],
  });

  assert.equal(result.blocks[1].content.title, "Notre sélection");
  assert.equal(result.blocks[1].content.html, "<p>Texte rédigé par l'agence.</p>");
  assert.equal(result.blocks.length, 4);
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

test("builds the missing commercial structure for a thin page", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale Gien", city: "Gien" },
    page: { slug: "croisieres", title: "Croisières", status: "published", published: true },
    siteSlug: "gien",
    blocks: [
      { id: "hero", type: "hero", status: "published", position: 0, content: { title: "Croisières à Gien", subtitle: "Introduction manuelle" } },
    ],
  });

  assert.deepEqual(result.blocks.map((block) => block.type || block.blockType), ["hero", "rich_text", "features", "cta"]);
  assert.equal(result.blocks[1].position, 1);
  assert.equal(result.blocks[2].position, 2);
  assert.equal(result.blocks[3].position, 3);
  assert.match(result.blocks[1].content.title, /croisières à Gien/i);
  assert.equal(result.blocks[2].content.items.length, 3);
  assert.equal(result.blocks[3].content.primaryCta.href, "/agence/gien/contact");
  assert.equal(result.changes.filter((change) => change.generated === true).length, 3);
});

test("generated commercial blocks pass the Website Designer V2 persistence validator", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale Gien", city: "Gien" },
    page: { slug: "circuits", title: "Circuits", status: "published", published: true },
    siteSlug: "gien",
    blocks: [
      { type: "hero", status: "published", position: 0, content: { title: "Circuits à Gien", subtitle: "Une introduction locale" } },
    ],
  });

  assert.doesNotThrow(() => validatePagePayload({
    page: {
      title: "Circuits",
      slug: "circuits",
      status: "published",
      seoTitle: "Circuits à Gien",
      metaDescription: "Découvrez nos circuits au départ de votre agence à Gien.",
      published: true,
    },
    blocks: result.blocks,
  }));
});

test("does not duplicate a complete manually structured commercial page", () => {
  const result = optimizePageContent({
    agency: { name: "Mondescale Gien", city: "Gien" },
    page: { slug: "sejours", title: "Séjours" },
    siteSlug: "gien",
    blocks: [
      { type: "hero", position: 0, content: { title: "Séjours à Gien", subtitle: "Intro manuelle" } },
      { type: "rich_text", position: 1, content: { title: "Notre expertise", html: "<p>Contenu éditorial validé.</p>" } },
      { type: "features", position: 2, content: { title: "Pourquoi nous choisir", introduction: "Contenu validé", items: [{ title: "Conseil", text: "Accompagnement" }], columns: 3 } },
      { type: "cta", position: 3, content: { title: "Votre projet", text: "Contactez-nous", primaryCta: { label: "Contact", href: "#contact" }, secondaryCta: null, style: "primary" } },
    ],
  });

  assert.equal(result.blocks.length, 4);
  assert.equal(result.changes.filter((change) => change.generated === true).length, 0);
});
