"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isPageLevelChange,
  pageFieldValue,
  validateExpectedChange,
} = require("../src/modules/minisite-seo-enrichment/post-rollout-validator");

test("MSE-25.30 valide seoTitle au niveau page après rollout", () => {
  const page = {
    seoTitle: "Agence de voyages à Gien | Mondescale",
    blocks: [],
  };
  const change = {
    blockType: "page",
    field: "seoTitle",
    next: "Agence de voyages à Gien | Mondescale",
  };

  assert.equal(isPageLevelChange(change), true);
  assert.equal(pageFieldValue(page, "seoTitle"), change.next);
  assert.deepEqual(validateExpectedChange(page, change), {
    ok: true,
    reason: null,
    expected: change,
    actual: change.next,
  });
});

test("MSE-25.30 valide metaDescription avec l'alias public seoDescription", () => {
  const page = {
    seoDescription: "Préparez votre voyage avec votre agence de Gien.",
    blocks: [],
  };
  const change = {
    blockType: "page",
    field: "metaDescription",
    next: "Préparez votre voyage avec votre agence de Gien.",
  };

  assert.equal(pageFieldValue(page, "metaDescription"), change.next);
  assert.equal(validateExpectedChange(page, change).ok, true);
});

test("MSE-25.30 signale une métadonnée page différente sans chercher un bloc", () => {
  const page = {
    seoTitle: "Ancien titre",
    blocks: [],
  };
  const change = {
    blockType: "page",
    field: "seoTitle",
    next: "Nouveau titre",
  };
  const result = validateExpectedChange(page, change);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "page-value-mismatch");
  assert.equal(result.actual, "Ancien titre");
});

test("MSE-25.30 conserve la validation historique des changements de bloc", () => {
  const page = {
    blocks: [{
      id: 12,
      type: "hero",
      content: { title: "Agence de voyages à Gien" },
    }],
  };
  const change = {
    blockId: 12,
    blockType: "hero",
    field: "title",
    next: "Agence de voyages à Gien",
  };

  assert.equal(isPageLevelChange(change), false);
  assert.equal(validateExpectedChange(page, change).ok, true);
});
