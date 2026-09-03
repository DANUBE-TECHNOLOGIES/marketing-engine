"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  siteHasPublicInspirations,
  applyInspirationIndexabilityContract,
} = require("../src/modules/minisite-structured-data/inspiration-indexability");

function localContent({ agencyIds, indexAgencyId = null } = {}) {
  return {
    id: "content-1",
    seo: {
      editorialTargeting: {
        scope: "agencies",
        agencyIds,
        indexAgencyId: indexAgencyId || agencyIds?.[0] || null,
      },
    },
  };
}

test("detects public inspiration targeted to the agency", () => {
  const site = { slug: "gien", agency: { id: 10 } };
  assert.equal(siteHasPublicInspirations(site, [localContent({ agencyIds: ["10"] })]), true);
  assert.equal(siteHasPublicInspirations(site, [localContent({ agencyIds: ["20"] })]), false);
});

test("network inspiration keeps the agency inspiration index useful", () => {
  const site = { slug: "gien", agencyId: 10 };
  const content = { id: "network", seo: { editorialTargeting: { scope: "network" } } };
  assert.equal(siteHasPublicInspirations(site, [content]), true);
});

test("removes empty inspiration index pages from sitemap", () => {
  const sitemap = {
    entries: [
      { type: "inspiration-index", siteSlug: "gien", agencyId: 10, url: "https://example.test/agence/gien/inspiration" },
      { type: "inspiration-index", siteSlug: "nevers", agencyId: 20, url: "https://example.test/agence/nevers/inspiration" },
      { type: "page", siteSlug: "nevers", url: "https://example.test/agence/nevers" },
    ],
    excluded: [],
    summary: { inspirationIndexPages: 2, entryCount: 3, excludedCount: 0 },
  };

  const result = applyInspirationIndexabilityContract(
    sitemap,
    [
      { slug: "gien", agency: { id: 10 } },
      { slug: "nevers", agency: { id: 20 } },
    ],
    [localContent({ agencyIds: ["10"] })]
  );

  assert.deepEqual(
    result.entries.filter((entry) => entry.type === "inspiration-index").map((entry) => entry.siteSlug),
    ["gien"]
  );
  assert.ok(result.entries.some((entry) => entry.type === "page" && entry.siteSlug === "nevers"));
  assert.ok(result.excluded.some((entry) => entry.siteSlug === "nevers" && entry.reason === "no-public-inspirations-for-agency"));
  assert.equal(result.summary.inspirationIndexPages, 1);
  assert.equal(result.summary.entryCount, 2);
  assert.equal(result.summary.excludedCount, 1);
});