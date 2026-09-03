"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { agencySummary } = require("../scripts/mse-25-30-network-preview");

test("MSE-25.30 operator preview preserves exclusion reasons without leaking internal page ids", () => {
  const summary = agencySummary({
    agencyId: 1,
    siteSlug: "gien",
    city: "Gien",
    summary: {
      pagesProcessed: 2,
      pagesChanged: 1,
      pagesExcludedNoindex: 2,
      pagesExcludedManagedRoute: 1,
    },
    targetCities: ["Montargis", "Briare"],
    excludedPages: [
      {
        pageId: 102,
        slug: "mentions-legales",
        title: "Mentions légales",
        reason: "noindex-page",
      },
      {
        pageId: 104,
        slug: "inspiration",
        title: "Inspirations",
        reason: "canonical-route-managed",
      },
    ],
    pages: [
      {
        slug: "circuits",
        title: "Circuits",
        changed: true,
        changes: [
          {
            blockId: 12,
            blockType: "hero",
            field: "title",
            previous: "Circuits",
            next: "Circuits à Gien",
            generated: false,
            purpose: "local-seo-h1",
          },
          {
            blockId: 21,
            blockType: "faq",
            field: "block",
            previous: null,
            next: { type: "faq", title: "Questions sur les circuits à Gien" },
            generated: true,
            purpose: "local-seo-faq",
          },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        changed: false,
        changes: [],
      },
    ],
  });

  assert.equal(summary.agencyId, 1);
  assert.equal(summary.siteSlug, "gien");
  assert.equal(summary.pagesProcessed, 2);
  assert.equal(summary.pagesChanged, 1);
  assert.equal(summary.pagesExcludedNoindex, 2);
  assert.equal(summary.pagesExcludedManagedRoute, 1);
  assert.deepEqual(summary.excludedPages, [
    {
      slug: "mentions-legales",
      title: "Mentions légales",
      reason: "noindex-page",
    },
    {
      slug: "inspiration",
      title: "Inspirations",
      reason: "canonical-route-managed",
    },
  ]);
  assert.equal(Object.hasOwn(summary.excludedPages[0], "pageId"), false);
  assert.deepEqual(summary.changedPages, [
    {
      slug: "circuits",
      title: "Circuits",
      changeCount: 2,
      changes: [
        {
          blockId: 12,
          blockType: "hero",
          field: "title",
          previous: "Circuits",
          next: "Circuits à Gien",
          generated: false,
          purpose: "local-seo-h1",
        },
        {
          blockId: 21,
          blockType: "faq",
          field: "block",
          previous: null,
          next: { type: "faq", title: "Questions sur les circuits à Gien" },
          generated: true,
          purpose: "local-seo-faq",
        },
      ],
    },
  ]);
});

test("MSE-25.30 operator preview derives exclusion counters for older payloads", () => {
  const summary = agencySummary({
    agencyId: 2,
    siteSlug: "nevers",
    excludedPages: [
      { slug: "privacy", title: "Confidentialité", reason: "noindex-page" },
      { slug: "inspiration", title: "Inspirations", reason: "canonical-route-managed" },
    ],
    pages: [],
  });

  assert.equal(summary.pagesExcludedNoindex, 1);
  assert.equal(summary.pagesExcludedManagedRoute, 1);
});
