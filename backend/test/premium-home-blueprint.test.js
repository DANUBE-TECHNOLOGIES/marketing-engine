"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPremiumHomePlan, classifyPremiumHome, isLegacyHomeCandidate } = require("../src/modules/agency-site/premium-home-blueprint");

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

test("une home V2 standard peut recevoir le layout premium en conservant ses contenus", () => {
  const plan = buildPremiumHomePlan({
    referenceBlocks,
    targetBlocks: [
      { blockType: "hero", displayOrder: 0, settings: { variant: "standard" }, content: { title: "Mondescale Gien" }, seo: { h1: true } },
      { blockType: "agency-introduction", displayOrder: 10, settings: {}, content: { text: "Conseil local à Gien" } },
    ],
  });
  assert.equal(plan.ready, true);
  assert.equal(plan.blocks[0].content.title, "Mondescale Gien");
  assert.deepEqual(plan.blocks[0].settings, { variant: "premium" });
  assert.deepEqual(plan.blocks[0].seo, { h1: true });
});

test("une home déjà alignée sur le blueprint premium est laissée intacte", () => {
  const targetBlocks = referenceBlocks.map((block, index) => ({ ...block, content: { title: `Local ${index}` } }));
  const classification = classifyPremiumHome({ referenceBlocks, targetBlocks });
  assert.equal(classification.status, "PREMIUM_MATCH");
  const plan = buildPremiumHomePlan({ referenceBlocks, targetBlocks });
  assert.equal(plan.ready, false);
  assert.equal(plan.reason, "PREMIUM_MATCH");
});

test("une structure V2 personnalisée avec des blocs supplémentaires est bloquée", () => {
  const targetBlocks = [
    { blockType: "hero", displayOrder: 0, content: { title: "Agence" } },
    { blockType: "agency-introduction", displayOrder: 10, content: { text: "Local" } },
    { blockType: "custom-gallery", displayOrder: 20, content: { items: [] } },
  ];
  const classification = classifyPremiumHome({ referenceBlocks, targetBlocks });
  assert.equal(classification.status, "CUSTOM_V2");
  const plan = buildPremiumHomePlan({ referenceBlocks, targetBlocks });
  assert.equal(plan.ready, false);
  assert.equal(plan.reason, "CUSTOM_V2");
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
