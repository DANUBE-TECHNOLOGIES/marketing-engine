"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  auditSitemapCrawlability,
} = require("../src/modules/minisite-structured-data/crawlability-audit");

test("classe les sources de découverte des URLs indexables", () => {
  const sitemap = auditSitemapCrawlability({
    summary: { entryCount: 5 },
    entries: [
      {
        url: "https://agences.mondescale.com/agence/gien",
        siteSlug: "gien",
        pageSlug: "",
      },
      {
        url: "https://agences.mondescale.com/agence/gien/services",
        siteSlug: "gien",
        pageSlug: "services",
      },
      {
        url: "https://agences.mondescale.com/agence/gien/destination/sicile",
        siteSlug: "gien",
        pageSlug: "destination/sicile",
        type: "destination",
      },
      {
        url: "https://agences.mondescale.com/agence/gien/inspiration",
        siteSlug: "gien",
        pageSlug: "inspiration",
        type: "inspiration-index",
      },
      {
        url: "https://agences.mondescale.com/agence/gien/inspiration/roadtrip-sicile",
        siteSlug: "gien",
        pageSlug: "inspiration/roadtrip-sicile",
        type: "inspiration",
      },
    ],
  });

  const byUrl = new Map(sitemap.entries.map((entry) => [entry.url, entry]));
  assert.equal(byUrl.get("https://agences.mondescale.com/agence/gien").discoverySource, "site-root");
  assert.equal(byUrl.get("https://agences.mondescale.com/agence/gien/services").discoverySource, "navigation");
  assert.equal(byUrl.get("https://agences.mondescale.com/agence/gien/destination/sicile").discoverySource, "destination-block");
  assert.equal(byUrl.get("https://agences.mondescale.com/agence/gien/inspiration").discoverySource, "footer");
  assert.equal(byUrl.get("https://agences.mondescale.com/agence/gien/inspiration/roadtrip-sicile").discoverySource, "inspiration-index");
  assert.equal(sitemap.summary.orphanedEntryCount, 0);
});

test("signale une inspiration indexée dont l'index parent est absent", () => {
  const sitemap = auditSitemapCrawlability({
    summary: { entryCount: 1 },
    entries: [
      {
        url: "https://agences.mondescale.com/agence/gien/inspiration/roadtrip-sicile",
        siteSlug: "gien",
        pageSlug: "inspiration/roadtrip-sicile",
        type: "inspiration",
      },
    ],
  });

  assert.equal(sitemap.summary.orphanedEntryCount, 1);
  assert.equal(sitemap.entries[0].discoverySource, null);
  assert.deepEqual(sitemap.crawlability.orphanEntries, [
    {
      url: "https://agences.mondescale.com/agence/gien/inspiration/roadtrip-sicile",
      type: "inspiration",
      siteSlug: "gien",
      pageSlug: "inspiration/roadtrip-sicile",
      reason: "missing-inspiration-index",
    },
  ]);
});

test("signale tout nouveau type d'URL sans source de découverte déclarée", () => {
  const sitemap = auditSitemapCrawlability({
    entries: [
      {
        url: "https://agences.mondescale.com/agence/gien/landing-inconnue",
        siteSlug: "gien",
        pageSlug: "landing-inconnue",
        type: "future-managed-route",
      },
    ],
  });

  assert.equal(sitemap.crawlability.orphanedEntryCount, 1);
  assert.equal(sitemap.crawlability.orphanEntries[0].reason, "unknown-discovery-source");
});
