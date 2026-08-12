"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPremiumHomePlan, classifyPremiumHome, contentFamily, isLegacyHomeCandidate } = require("../src/modules/agency-site/premium-home-blueprint");

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

test("cta premium peut réutiliser le contenu local contact-cta sans invention", () => {
  assert.equal(contentFamily("cta"), "contact-cta");
  assert.equal(contentFamily("contact-cta"), "contact-cta");
  const plan = buildPremiumHomePlan({
    referenceBlocks: [
      { blockType: "hero", displayOrder: 0, settings: { variant: "premium" } },
      { blockType: "cta", displayOrder: 10, settings: { variant: "premium-dark" } },
    ],
    targetBlocks: [
      { blockType: "hero", displayOrder: 0, content: { title: "Mondescale Dax" } },
      { blockType: "contact-cta", displayOrder: 10, content: { title: "Parlons de votre voyage", text: "Contenu local Dax" } },
    ],
  });
  assert.equal(plan.ready, true);
  assert.equal(plan.blocks[1].blockType, "cta");
  assert.equal(plan.blocks[1].content.text, "Contenu local Dax");
  assert.deepEqual(plan.blocks[1].settings, { variant: "premium-dark" });
});

test("cta et contact-cta sont équivalents pour reconnaître un blueprint premium déjà appliqué", () => {
  const reference = [
    { blockType: "hero", displayOrder: 0, settings: { variant: "premium" }, visibleDesktop: true, visibleMobile: true },
    { blockType: "cta", displayOrder: 10, settings: { variant: "premium-dark" }, visibleDesktop: true, visibleMobile: true },
  ];
  const migrated = [
    { blockType: "hero", displayOrder: 0, settings: { variant: "premium" }, content: { title: "Agence locale" }, status: "draft", version: 7 },
    { blockType: "contact-cta", displayOrder: 10, settings: { variant: "premium-dark" }, content: { title: "Votre projet" }, status: "published", version: 3 },
  ];
  assert.equal(classifyPremiumHome({ referenceBlocks: reference, targetBlocks: migrated }).status, "PREMIUM_MATCH");
});

test("les égalités de displayOrder ne dépendent pas de l'ordre de retour de la base", () => {
  const reference = [
    { blockType: "hero", displayOrder: 0, settings: { source: "mse-14.2" } },
    { blockType: "hero", displayOrder: 0, settings: { source: "mse-14.2" } },
    { blockType: "cta", displayOrder: 1, settings: { source: "mse-14.2" } },
    { blockType: "text", displayOrder: 2, settings: {} },
  ];
  const target = [
    { blockType: "hero", displayOrder: 0, settings: { source: "mse-14.2" }, content: { title: "Local 1" } },
    { blockType: "cta", displayOrder: 1, settings: { source: "mse-14.2" }, content: { title: "CTA local" } },
    { blockType: "hero", displayOrder: 0, settings: { source: "mse-14.2" }, content: { title: "Local 2" } },
    { blockType: "text", displayOrder: 2, settings: {}, content: { text: "Local" } },
  ];
  assert.equal(classifyPremiumHome({ referenceBlocks: reference, targetBlocks: target }).status, "PREMIUM_MATCH");
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
