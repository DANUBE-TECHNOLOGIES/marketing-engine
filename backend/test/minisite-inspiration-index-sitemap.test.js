"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildPublicSitemap,
  inspirationIndexUrl,
  pageChangeFrequency,
  pagePriority,
} = require("../src/modules/minisite-structured-data/sitemap");

test("published mini-sites expose their inspiration landing page in the sitemap", () => {
  const result = buildPublicSitemap({
    publicOrigin: "https://agences.mondescale.com",
    sites: [
      {
        id: "site-1",
        slug: "gien",
        status: "published",
        publishedAt: "2026-08-11T12:00:00.000Z",
        agencyId: 1,
        agency: { id: 1 },
        pages: [],
      },
    ],
    inspirations: [],
    destinations: [],
  });

  assert.equal(
    inspirationIndexUrl("https://agences.mondescale.com", "gien"),
    "https://agences.mondescale.com/agence/gien/inspiration"
  );
  assert.equal(
    result.entries.some((entry) => entry.type === "inspiration-index" && entry.pageSlug === "inspiration"),
    true
  );
  assert.equal(result.summary.inspirationIndexPages, 1);
  assert.equal(pagePriority("inspiration"), 0.6);
  assert.equal(pageChangeFrequency("inspiration"), "weekly");
});

test("unpublished mini-sites do not expose an inspiration landing page", () => {
  const result = buildPublicSitemap({
    publicOrigin: "https://agences.mondescale.com",
    sites: [
      {
        id: "site-1",
        slug: "gien",
        status: "draft",
        agencyId: 1,
        agency: { id: 1 },
        pages: [],
      },
    ],
    inspirations: [],
    destinations: [],
  });

  assert.equal(result.summary.inspirationIndexPages, 0);
  assert.equal(result.entries.some((entry) => entry.type === "inspiration-index"), false);
});
