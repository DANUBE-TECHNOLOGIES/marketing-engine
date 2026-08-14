"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPublicSitemap,
  canonicalPageSlug,
} = require("../src/modules/minisite-structured-data/sitemap");

test("canonicalPageSlug folds public aliases", () => {
  assert.equal(canonicalPageSlug("home"), "");
  assert.equal(canonicalPageSlug("accueil"), "");
  assert.equal(canonicalPageSlug("index"), "");
  assert.equal(canonicalPageSlug("inspirations"), "inspiration");
  assert.equal(canonicalPageSlug("services"), "services");
});

test("public sitemap emits only canonical page URLs", () => {
  const sitemap = buildPublicSitemap({
    publicOrigin: "https://agences.mondescale.com",
    sites: [
      {
        id: "site-1",
        slug: "ambassade-fram-mondescale-gien",
        status: "published",
        updatedAt: "2026-08-14T08:00:00.000Z",
        agencyId: 3,
        agency: { id: 3 },
        pages: [
          {
            id: "home",
            slug: "home",
            status: "published",
            updatedAt: "2026-08-14T09:00:00.000Z",
          },
          {
            id: "accueil",
            slug: "accueil",
            status: "published",
            updatedAt: "2026-08-14T09:01:00.000Z",
          },
          {
            id: "inspirations",
            slug: "inspirations",
            status: "published",
          },
          {
            id: "inspiration",
            slug: "inspiration",
            status: "published",
          },
          {
            id: "services",
            slug: "services",
            status: "published",
          },
          {
            id: "legal",
            slug: "mentions-legales",
            status: "published",
          },
        ],
      },
    ],
    inspirations: [],
    destinations: [],
  });

  const urls = sitemap.entries.map((entry) => entry.url);

  assert.deepEqual(urls, [
    "https://agences.mondescale.com/agence/ambassade-fram-mondescale-gien",
    "https://agences.mondescale.com/agence/ambassade-fram-mondescale-gien/inspiration",
    "https://agences.mondescale.com/agence/ambassade-fram-mondescale-gien/services",
  ]);

  assert.ok(
    sitemap.excluded.some((entry) => entry.reason === "canonical-home-alias")
  );
  assert.ok(
    sitemap.excluded.some((entry) => entry.reason === "canonical-route-managed")
  );
  assert.ok(
    sitemap.excluded.some((entry) => entry.reason === "noindex-page")
  );
});
