"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { agencySummary, normalizeOrigin } = require("../scripts/mse-25-30-network-preview");

test("MSE-25.30 network preview command normalizes backend origin", () => {
  assert.equal(normalizeOrigin("http://127.0.0.1:4000///"), "http://127.0.0.1:4000");
});

test("MSE-25.30 network preview command summarizes changed pages by agency", () => {
  const summary = agencySummary({
    agencyId: 12,
    siteSlug: "gien",
    city: "Gien",
    targetCities: ["Briare"],
    summary: { pagesProcessed: 3, pagesChanged: 1 },
    pages: [
      { slug: "home", title: "Accueil", changed: false, changes: [] },
      { slug: "circuits", title: "Circuits", changed: true, changes: [{ blockType: "faq", field: "block", generated: true }] },
    ],
  });
  assert.equal(summary.pagesProcessed, 3);
  assert.equal(summary.pagesChanged, 1);
  assert.deepEqual(summary.targetCities, ["Briare"]);
  assert.deepEqual(summary.changedPages, [
    {
      slug: "circuits",
      title: "Circuits",
      changeCount: 1,
      changes: [{ blockType: "faq", field: "block", generated: true }],
    },
  ]);
});
