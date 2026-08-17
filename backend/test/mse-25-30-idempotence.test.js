"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  reconcileNetworkPlan,
  reconcilePage,
} = require("../src/modules/minisite-seo-enrichment/idempotence-patch");

const differentiation = {
  title: "Une relation de conseil suivie à Gien",
  html: "<p>À Gien, la qualité du conseil repose sur des engagements concrets.</p>",
  alignment: "left",
};

test("removes metadata changes that became no-op after editorial naturalization", () => {
  const page = reconcilePage({
    slug: "home",
    changed: true,
    optimizedBlocks: [],
    changes: [
      {
        blockType: "page",
        field: "metaDescription",
        previous: "Mondescale Gien vous accompagne pour préparer votre voyage.",
        next: "Mondescale Gien vous accompagne pour préparer votre voyage.",
        generated: true,
      },
    ],
  });

  assert.equal(page.changed, false);
  assert.deepEqual(page.changes, []);
});

test("keeps historical differentiation block and drops generated duplicate", () => {
  const historical = {
    id: "historical",
    type: "rich_text",
    status: "published",
    position: 2,
    content: differentiation,
    settings: {},
    seo: {},
  };
  const duplicate = {
    type: "rich_text",
    status: "published",
    position: 3,
    content: differentiation,
    settings: {},
    seo: {
      generatedBy: "mse-25.30",
      purpose: "local-agency-differentiation",
    },
  };

  const page = reconcilePage({
    slug: "engagements",
    changed: true,
    optimizedBlocks: [historical, duplicate],
    changes: [
      {
        blockId: null,
        blockType: "rich-text",
        field: "block",
        previous: null,
        next: differentiation,
        generated: true,
        purpose: "local-agency-differentiation",
      },
    ],
  });

  assert.equal(page.changed, false);
  assert.equal(page.optimizedBlocks.length, 1);
  assert.equal(page.optimizedBlocks[0].id, "historical");
  assert.deepEqual(page.changes, []);
});

test("network summary reflects reconciled page delta", () => {
  const result = reconcileNetworkPlan({
    summary: { pagesChanged: 2 },
    plans: [
      {
        summary: { pagesChanged: 2, blockFieldsChanged: 2 },
        pages: [
          {
            slug: "home",
            changed: true,
            optimizedBlocks: [],
            changes: [{ blockType: "page", field: "metaDescription", previous: "same", next: "same" }],
          },
          {
            slug: "agence",
            changed: true,
            optimizedBlocks: [],
            changes: [{ blockType: "features", field: "introduction", previous: "", next: "Texte local" }],
          },
        ],
      },
    ],
  });

  assert.equal(result.summary.pagesChanged, 1);
  assert.equal(result.plans[0].summary.pagesChanged, 1);
  assert.equal(result.plans[0].summary.blockFieldsChanged, 1);
});
