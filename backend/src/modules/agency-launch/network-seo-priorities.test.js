"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  opportunityScore,
  networkSeoPriorities,
} = require("./network-seo-priorities");

test("ranking and citation actions outrank lower impact content tasks at equal priority", () => {
  assert.ok(
    opportunityScore({ priority: "high", source: "LOCAL_RANKINGS" }) >
      opportunityScore({ priority: "high", source: "LOCAL_CONTENT" })
  );
  assert.ok(
    opportunityScore({ priority: "high", source: "LOCAL_CITATIONS" }) >
      opportunityScore({ priority: "medium", source: "LOCAL_RANKINGS" })
  );
});

test("network queue merges agency actions and keeps agency identity", () => {
  const result = networkSeoPriorities([
    {
      agency: { id: 2, name: "Mondescale Nevers", city: "Nevers" },
      seoActions: {
        actions: [{
          priority: "medium",
          code: "LOCAL_CONTENT_THIN",
          title: "Enrichir le contenu",
          detail: "Ajouter du contenu local utile.",
          source: "LOCAL_CONTENT",
        }],
      },
    },
    {
      agency: { id: 1, name: "Mondescale Gien", city: "Gien" },
      seoActions: {
        actions: [{
          priority: "high",
          code: "RANKING_NEAR_TOP10",
          title: "Renforcer la page services",
          detail: "Optimiser la page déjà classée 13e.",
          source: "LOCAL_RANKINGS",
        }],
      },
    },
  ]);

  assert.equal(result.total, 2);
  assert.equal(result.agenciesWithActions, 2);
  assert.equal(result.actions[0].agency.city, "Gien");
  assert.equal(result.actions[0].source, "LOCAL_RANKINGS");
});

test("network queue respects a bounded result limit", () => {
  const result = networkSeoPriorities([
    {
      agency: { id: 1, name: "Agence", city: "Gien" },
      seoActions: {
        actions: Array.from({ length: 12 }, (_, index) => ({
          priority: "medium",
          code: `ACTION_${index}`,
          title: `Action ${index}`,
          detail: "À traiter",
          source: "LOCAL_CONTENT",
        })),
      },
    },
  ], 5);

  assert.equal(result.total, 12);
  assert.equal(result.actions.length, 5);
});
