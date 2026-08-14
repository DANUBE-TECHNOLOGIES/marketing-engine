"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  attachIndexationReadiness,
  siteIndexationReadiness,
} = require("../src/modules/minisite-structured-data/indexation-readiness");

function sitemapFixture() {
  return {
    entries: [
      { siteSlug: "gien", pageSlug: "", url: "https://example.test/agence/gien", discoverySource: "site-root" },
      { siteSlug: "gien", pageSlug: "contact", url: "https://example.test/agence/gien/contact", discoverySource: "navigation" },
      { type: "destination", siteSlug: "gien", pageSlug: "destination/sicile", url: "https://example.test/agence/gien/destination/sicile", discoverySource: "destination-block" },
      { type: "inspiration-index", siteSlug: "gien", pageSlug: "inspiration", url: "https://example.test/agence/gien/inspiration", discoverySource: "footer" },
      { siteSlug: "nevers", pageSlug: "contact", url: "https://example.test/agence/nevers/contact", discoverySource: "navigation" },
    ],
    excluded: [
      { siteSlug: "gien", pageSlug: "engagements", reason: "critically-thin-content" },
    ],
    crawlability: {
      orphanEntries: [],
      orphanedEntryCount: 0,
    },
    summary: {},
  };
}

test("site remains submit-ready when only optional thin pages are excluded", () => {
  const readiness = siteIndexationReadiness(sitemapFixture(), "gien");
  assert.equal(readiness.readyToSubmit, true);
  assert.equal(readiness.rootPresent, true);
  assert.equal(readiness.criticallyThinExcludedCount, 1);
  assert.ok(readiness.warnings.includes("critically-thin-pages-excluded"));
  assert.equal(readiness.blockers.length, 0);
});

test("missing indexable site root blocks submission for that minisite", () => {
  const readiness = siteIndexationReadiness(sitemapFixture(), "nevers");
  assert.equal(readiness.readyToSubmit, false);
  assert.ok(readiness.blockers.includes("missing-indexable-site-root"));
});

test("orphaned entries block sitemap submission for the affected minisite", () => {
  const sitemap = sitemapFixture();
  sitemap.crawlability.orphanEntries = [
    { siteSlug: "gien", url: "https://example.test/agence/gien/inspiration/test", reason: "missing-inspiration-index" },
  ];

  const readiness = siteIndexationReadiness(sitemap, "gien");
  assert.equal(readiness.readyToSubmit, false);
  assert.ok(readiness.blockers.includes("orphaned-indexable-entries"));
});

test("network readiness aggregates ready and blocked minisites", () => {
  const result = attachIndexationReadiness(sitemapFixture());
  assert.equal(result.indexationReadiness.siteCount, 2);
  assert.equal(result.indexationReadiness.readySites, 1);
  assert.equal(result.indexationReadiness.blockedSites, 1);
  assert.equal(result.indexationReadiness.readyToSubmit, false);
  assert.equal(result.summary.indexationReadySites, 1);
  assert.equal(result.summary.indexationBlockedSites, 1);
});