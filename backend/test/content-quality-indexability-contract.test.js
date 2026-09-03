"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CRITICAL_PAGE_MIN_WORDS,
  applyContentQualityIndexabilityContract,
  assessCriticalContentQuality,
} = require("../src/modules/minisite-structured-data/content-quality-indexability");

function words(count) {
  return Array.from({ length: count }, (_, index) => `mot${index + 1}`).join(" ");
}

function siteWithPage(page) {
  return {
    id: "site-1",
    slug: "gien",
    agency: { id: 10 },
    pages: [page],
  };
}

test("critically thin means short and without a functional block", () => {
  const quality = assessCriticalContentQuality({
    slug: "engagements",
    blocks: [{ blockType: "rich-text", content: { text: words(CRITICAL_PAGE_MIN_WORDS - 1) } }],
  });

  assert.equal(quality.criticallyThin, true);
  assert.equal(quality.functional, false);
});

test("a short functional page remains indexable", () => {
  const quality = assessCriticalContentQuality({
    slug: "contact",
    blocks: [{ blockType: "contact", content: { title: "Contactez votre agence" } }],
  });

  assert.equal(quality.words < CRITICAL_PAGE_MIN_WORDS, true);
  assert.equal(quality.functional, true);
  assert.equal(quality.criticallyThin, false);
});

test("a sufficiently developed editorial page remains indexable", () => {
  const quality = assessCriticalContentQuality({
    slug: "engagements",
    blocks: [{ blockType: "rich-text", content: { text: words(CRITICAL_PAGE_MIN_WORDS) } }],
  });

  assert.equal(quality.criticallyThin, false);
});

test("removes only critically thin general pages from sitemap", () => {
  const thinPage = {
    id: "page-thin",
    slug: "engagements",
    status: "published",
    blocks: [{ blockType: "rich-text", content: { text: "Quelques mots seulement." } }],
  };
  const contactPage = {
    id: "page-contact",
    slug: "contact",
    status: "published",
    blocks: [{ blockType: "contact", content: { title: "Nous contacter" } }],
  };
  const sitemap = {
    entries: [
      { siteSlug: "gien", agencyId: 10, pageSlug: "engagements", url: "https://example.test/agence/gien/engagements" },
      { siteSlug: "gien", agencyId: 10, pageSlug: "contact", url: "https://example.test/agence/gien/contact" },
      { type: "destination", siteSlug: "gien", pageSlug: "destination/sicile", url: "https://example.test/agence/gien/destination/sicile" },
    ],
    excluded: [],
    summary: { entryCount: 3, excludedCount: 0 },
  };

  const result = applyContentQualityIndexabilityContract(
    sitemap,
    [{ ...siteWithPage(thinPage), pages: [thinPage, contactPage] }]
  );

  assert.equal(result.entries.some((entry) => entry.pageSlug === "engagements"), false);
  assert.equal(result.entries.some((entry) => entry.pageSlug === "contact"), true);
  assert.equal(result.entries.some((entry) => entry.type === "destination"), true);
  assert.ok(result.excluded.some((entry) => entry.pageSlug === "engagements" && entry.reason === "critically-thin-content"));
  assert.equal(result.summary.criticallyThinExcludedCount, 1);
  assert.equal(result.summary.entryCount, 2);
});