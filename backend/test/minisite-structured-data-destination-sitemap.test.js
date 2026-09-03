"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPublicSitemap,
} = require("../src/modules/minisite-structured-data");

function destinationUrls(result) {
  return result.entries
    .filter((entry) => entry.type === "destination")
    .map((entry) => entry.url)
    .sort();
}

test("le sitemap résout les destinationIds manuels comme le rendu public", () => {
  const result = buildPublicSitemap({
    publicOrigin: "https://agences.mondescale.com",
    destinations: [
      { id: "dest-fr", slug: "france", name: "France" },
      { id: "dest-sicile", slug: "sicile", name: "Sicile" },
      { id: "dest-japon", slug: "japon", name: "Japon" },
    ],
    sites: [
      {
        id: "site-gien",
        slug: "gien",
        status: "published",
        agency: { id: 10 },
        pages: [
          {
            id: "home-gien",
            slug: "",
            status: "published",
            blocks: [
              {
                blockType: "destinations",
                content: {
                  source: "manual",
                  selectionMode: "manual",
                  destinationIds: ["dest-sicile"],
                  limit: 6,
                },
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(destinationUrls(result), [
    "https://agences.mondescale.com/agence/gien/destination/sicile",
  ]);
});

test("le sitemap reproduit la sélection automatique et sa limite", () => {
  const result = buildPublicSitemap({
    publicOrigin: "https://agences.mondescale.com",
    // Le repository du sitemap fournit désormais ce catalogue dans le même
    // ordre alphabétique que public-site-read.
    destinations: [
      { id: "dest-fr", slug: "france", name: "France" },
      { id: "dest-japon", slug: "japon", name: "Japon" },
      { id: "dest-maldives", slug: "maldives", name: "Maldives" },
      { id: "dest-sicile", slug: "sicile", name: "Sicile" },
    ],
    sites: [
      {
        id: "site-maurepas",
        slug: "maurepas",
        status: "published",
        agency: { id: 20 },
        pages: [
          {
            id: "home-maurepas",
            slug: "",
            status: "published",
            blocks: [
              {
                blockType: "destinations",
                content: {
                  source: "travel-core",
                  selectionMode: "automatic",
                  limit: 2,
                },
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(destinationUrls(result), [
    "https://agences.mondescale.com/agence/maurepas/destination/france",
    "https://agences.mondescale.com/agence/maurepas/destination/japon",
  ]);
});

test("un bloc destination non public ne crée aucune landing dans le sitemap", () => {
  const result = buildPublicSitemap({
    publicOrigin: "https://agences.mondescale.com",
    destinations: [
      { id: "dest-sicile", slug: "sicile", name: "Sicile" },
    ],
    sites: [
      {
        id: "site-nevers",
        slug: "nevers",
        status: "published",
        agency: { id: 30 },
        pages: [
          {
            id: "home-nevers",
            slug: "",
            status: "published",
            blocks: [
              {
                blockType: "destinations",
                status: "draft",
                content: {
                  destinationIds: ["dest-sicile"],
                },
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(destinationUrls(result), []);
  assert.ok(
    result.excluded.some(
      (entry) =>
        entry.type === "destination" &&
        entry.destinationSlug === "sicile" &&
        entry.reason === "not-exposed-by-published-site"
    )
  );
});
