"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { qualityForTarget, firstHeading } = require("../src/modules/minisite-structured-data/local-intent-target-quality");
const { INTENTS } = require("../src/modules/minisite-structured-data/local-search-intent-coverage");

test("local target quality reads the real Hero title as H1 even when another titled block comes first", () => {
  const blocks = [
    { type: "rich_text", content: { title: "Préparer votre projet" } },
    { type: "hero", content: { title: "Agence de voyages à Gien", subtitle: "Votre équipe locale" } },
  ];

  assert.equal(firstHeading(blocks), "Agence de voyages à Gien");

  const intent = INTENTS.find((item) => item.key === "agency");
  const quality = qualityForTarget({
    slug: "accueil",
    seoTitle: "Agence de voyages à Gien | Mondescale Gien",
    metaDescription: "Votre agence de voyages à Gien vous conseille pour vos prochains départs.",
    blocks,
  }, "Gien", intent);

  assert.equal(quality.titleQualified, true);
  assert.equal(quality.metaQualified, true);
  assert.equal(quality.h1Qualified, true);
});
