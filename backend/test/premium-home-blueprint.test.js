"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPremiumHomePlan, isLegacyHomeCandidate } = require("../src/modules/agency-site/premium-home-blueprint");

const referenceBlocks = [
  { blockType: "hero", displayOrder: 0, settings: { variant: "premium" }, visibleDesktop: true, visibleMobile: true },
  { blockType: "agency-introduction", displayOrder: 10, settings: { width: "wide" }, visibleDesktop: true, visibleMobile: true },
];

test("une home historique sans blocks V2 est une candidate de migration", () => {
  assert.equal(isLegacyHomeCandidate({ slug: "", blocks: [] }), true);
  assert.equal(isLegacyHomeCandidate({ slug: "home", blocks: [] }), true);
  assert.equal(isLegacyHomeCandidate({ slug: "home", blocks: [{ id: "manual" }] }), false);
});

test("le blueprint copie le layout premium mais conserve uniquement le contenu local", () => {
  const plan = buildPremiumHomePlan({
    referenceBlocks,
    targetSections: [
      { sectionType: "hero", jsonContent: { title: "Mondescale Lamorlaye", city: "Lamorlaye" } },
      { sectionType: "agency-introduction", jsonContent: { title: "Votre agence à Lamorlaye", text: "Contenu local" } },
    ],
  });
  assert.equal(plan.ready, true);
  assert.deepEqual(plan.blocks[0].settings, { variant: "premium" });
  assert.equal(plan.blocks[0].content.title, "Mondescale Lamorlaye");
  assert.equal(plan.blocks[1].content.text, "Contenu local");
  assert.equal(JSON.stringify(plan.blocks).includes("Bois-Colombes"), false);
});

test("une home déjà en V2 n'est jamais écrasée automatiquement", () => {
  const plan = buildPremiumHomePlan({ referenceBlocks, targetBlocks: [{ blockType: "hero", content: { title: "Édité manuellement" } }] });
  assert.equal(plan.ready, false);
  assert.equal(plan.reason, "TARGET_ALREADY_V2");
});

test("la migration est bloquée si le blueprint premium demande un contenu local indisponible", () => {
  const plan = buildPremiumHomePlan({
    referenceBlocks: [...referenceBlocks, { blockType: "trust", displayOrder: 20, settings: {} }],
    targetSections: [{ sectionType: "hero", jsonContent: { title: "Agence locale" } }, { sectionType: "agency-introduction", jsonContent: { text: "Local" } }],
  });
  assert.equal(plan.ready, false);
  assert.equal(plan.reason, "LOCAL_CONTENT_MISSING");
  assert.deepEqual(plan.missingTypes, ["trust"]);
});
