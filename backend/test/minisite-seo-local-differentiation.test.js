"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { resolvedTargetCities } = require("../src/modules/minisite-seo-enrichment/local-area-context");
const {
  applyLocalAreaDifferentiation,
  buildLocalAreaContent,
} = require("../src/modules/minisite-seo-enrichment/local-differentiator");
const { validatePagePayload } = require("../src/modules/page-builder-persistence/validation");

test("MSE-25.30 resolves different local catchment areas for different agencies", () => {
  const gien = resolvedTargetCities({
    slug: "ambassade-fram-mondescale-gien",
    agency: { city: "Gien" },
  });
  const nevers = resolvedTargetCities({
    slug: "ambassade-fram-mondescale-nevers",
    agency: { city: "Nevers" },
  });

  assert.deepEqual(gien.slice(0, 3), ["Poilly-lez-Gien", "Briare", "Châtillon-sur-Loire"]);
  assert.deepEqual(nevers.slice(0, 3), ["Varennes-Vauzelles", "Coulanges-lès-Nevers", "Marzy"]);
  assert.notDeepEqual(gien, nevers);
});

test("MSE-25.30 prefers explicit target cities over configured fallback", () => {
  const cities = resolvedTargetCities({
    slug: "ambassade-fram-mondescale-gien",
    targetCities: ["Montargis", "Sully-sur-Loire", "Gien"],
    agency: { city: "Gien" },
  });

  assert.deepEqual(cities, ["Montargis", "Sully-sur-Loire"]);
});

test("MSE-25.30 adds one local-area block without creating doorway pages", () => {
  const baseBlocks = [
    {
      type: "hero",
      status: "published",
      position: 0,
      content: {
        title: "Croisières à Gien",
        subtitle: "Votre agence vous conseille.",
      },
    },
  ];
  const result = applyLocalAreaDifferentiation({
    blocks: baseBlocks,
    changes: [],
    agency: { name: "Mondescale Gien", city: "Gien" },
    page: { slug: "croisieres", title: "Croisières" },
    targetCities: ["Poilly-lez-Gien", "Briare", "Châtillon-sur-Loire"],
  });

  assert.equal(result.blocks.length, 2);
  assert.equal(result.blocks[1].type, "rich_text");
  assert.match(result.blocks[1].content.html, /Poilly-lez-Gien/);
  assert.match(result.blocks[1].content.html, /Briare/);
  assert.match(result.blocks[1].content.html, /croisières/i);
  assert.equal(result.changes[0].purpose, "local-area-differentiation");

  assert.doesNotThrow(() => validatePagePayload({
    page: {
      title: "Croisières",
      slug: "croisieres",
      status: "published",
      published: true,
    },
    blocks: result.blocks,
  }));
});

test("MSE-25.30 does not duplicate local-area copy when the page already covers the catchment", () => {
  const blocks = [
    {
      type: "rich_text",
      status: "published",
      position: 0,
      content: {
        title: "Notre zone de proximité",
        html: "<p>Nous accueillons les voyageurs de Briare et Poilly-lez-Gien.</p>",
        alignment: "left",
      },
    },
  ];
  const result = applyLocalAreaDifferentiation({
    blocks,
    changes: [],
    agency: { name: "Mondescale Gien", city: "Gien" },
    page: { slug: "circuits", title: "Circuits" },
    targetCities: ["Poilly-lez-Gien", "Briare", "Châtillon-sur-Loire"],
  });

  assert.equal(result.blocks.length, 1);
  assert.equal(result.changes.length, 0);
});

test("MSE-25.30 local copy differs materially between Gien and Nevers", () => {
  const page = { slug: "voyages-sur-mesure", title: "Voyages sur mesure" };
  const gien = buildLocalAreaContent({
    agency: { name: "Mondescale Gien", city: "Gien" },
    page,
    targetCities: ["Briare", "Poilly-lez-Gien", "Sully-sur-Loire"],
  });
  const nevers = buildLocalAreaContent({
    agency: { name: "Mondescale Nevers", city: "Nevers" },
    page,
    targetCities: ["Marzy", "Varennes-Vauzelles", "Fourchambault"],
  });

  assert.notEqual(gien.html, nevers.html);
  assert.match(gien.html, /Briare/);
  assert.match(nevers.html, /Marzy/);
});
