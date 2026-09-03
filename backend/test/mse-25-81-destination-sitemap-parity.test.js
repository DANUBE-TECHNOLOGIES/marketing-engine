"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPublicSitemap,
  siteDestinationSlugs,
} = require("../src/modules/minisite-structured-data/sitemap");
const {
  selectDestinationSlugsForBlock,
} = require("../src/modules/public-site-read/destination-selection");

const PUBLIC_ORIGIN = "https://agences.mondescale.com";

function destination(id, slug) {
  return {
    id,
    slug,
    status: "published",
    publishedAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  };
}

function publishedSite(blocks, overrides = {}) {
  return {
    id: overrides.id || "site-1",
    slug: overrides.slug || "ambassade-fram-mondescale-gien",
    status: "published",
    publishedAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    agencyId: overrides.agencyId || "agency-1",
    agency: {
      id: overrides.agencyId || "agency-1",
      name: overrides.agencyName || "Mondescale Gien",
    },
    pages: [
      {
        id: "page-home",
        slug: "home",
        status: "published",
        publishedAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-20T00:00:00.000Z",
        blocks,
      },
    ],
  };
}

function destinationEntries(sitemap, siteSlug) {
  return (sitemap.entries || [])
    .filter((entry) => entry.type === "destination" && entry.siteSlug === siteSlug)
    .map((entry) => entry.destinationSlug)
    .sort();
}

test("MSE-25.81 manual selection indexes exactly the destinations exposed by the public block", () => {
  const destinations = [
    destination("d-1", "maldives"),
    destination("d-2", "seychelles"),
    destination("d-3", "maurice"),
  ];
  const block = {
    id: "block-destinations",
    type: "destinations",
    status: "published",
    content: {
      source: "manual",
      selectionMode: "manual",
      destinationIds: ["d-2", "d-1"],
      limit: 2,
    },
  };
  const site = publishedSite([block]);

  assert.deepEqual(
    selectDestinationSlugsForBlock(block, destinations),
    ["seychelles", "maldives"]
  );
  assert.deepEqual(
    [...siteDestinationSlugs(site, destinations)].sort(),
    ["maldives", "seychelles"]
  );

  const sitemap = buildPublicSitemap({
    sites: [site],
    destinations,
    inspirations: [],
    publicOrigin: PUBLIC_ORIGIN,
  });

  assert.deepEqual(
    destinationEntries(sitemap, site.slug),
    ["maldives", "seychelles"]
  );
  assert.equal(
    sitemap.entries.some((entry) => entry.url.endsWith("/destination/maurice")),
    false
  );
  assert.equal(
    sitemap.excluded.some(
      (entry) =>
        entry.type === "destination" &&
        entry.destinationSlug === "maurice" &&
        entry.reason === "not-exposed-by-published-site"
    ),
    true
  );
});

test("MSE-25.81 automatic selection reuses the same selector for public rendering and sitemap generation", () => {
  const destinations = [
    destination("d-1", "sicile"),
    destination("d-2", "tunisie"),
    destination("d-3", "albanie"),
  ];
  const block = {
    id: "block-auto",
    blockType: "destinations",
    status: "published",
    content: {
      source: "travel-core",
      selectionMode: "automatic",
      limit: 2,
    },
  };
  const site = publishedSite([block], {
    id: "site-2",
    slug: "ambassade-fram-mondescale-nevers",
    agencyId: "agency-2",
  });

  const renderedSelection = selectDestinationSlugsForBlock(block, destinations).sort();
  const sitemap = buildPublicSitemap({
    sites: [site],
    destinations,
    inspirations: [],
    publicOrigin: PUBLIC_ORIGIN,
  });

  assert.deepEqual(renderedSelection, ["sicile", "tunisie"]);
  assert.deepEqual(destinationEntries(sitemap, site.slug), renderedSelection);
  assert.equal(sitemap.summary.indexedDestinationPages, 2);
});

test("MSE-25.81 hidden destination blocks cannot leak landing pages into the public sitemap", () => {
  const destinations = [destination("d-1", "budapest")];
  const site = publishedSite([
    {
      id: "block-hidden",
      type: "destinations",
      status: "draft",
      content: {
        source: "manual",
        selectionMode: "manual",
        destinationIds: ["d-1"],
      },
    },
  ]);

  const sitemap = buildPublicSitemap({
    sites: [site],
    destinations,
    inspirations: [],
    publicOrigin: PUBLIC_ORIGIN,
  });

  assert.deepEqual(destinationEntries(sitemap, site.slug), []);
  assert.equal(
    sitemap.excluded.some(
      (entry) =>
        entry.type === "destination" &&
        entry.destinationSlug === "budapest" &&
        entry.reason === "not-exposed-by-published-site"
    ),
    true
  );
});

test("MSE-25.81 explicit public destination cards are also canonical sitemap discovery sources", () => {
  const destinations = [
    destination("d-1", "maldives"),
    destination("d-2", "seychelles"),
  ];
  const site = publishedSite([
    {
      id: "block-cards",
      type: "destination-grid",
      status: "published",
      content: {
        items: [
          { slug: "maldives" },
          { href: "/destination/seychelles" },
        ],
      },
    },
  ]);

  const sitemap = buildPublicSitemap({
    sites: [site],
    destinations,
    inspirations: [],
    publicOrigin: PUBLIC_ORIGIN,
  });

  assert.deepEqual(
    destinationEntries(sitemap, site.slug),
    ["maldives", "seychelles"]
  );
  for (const slug of ["maldives", "seychelles"]) {
    assert.equal(
      sitemap.entries.some(
        (entry) =>
          entry.type === "destination" &&
          entry.url === `${PUBLIC_ORIGIN}/agence/${site.slug}/destination/${slug}`
      ),
      true
    );
  }
});
