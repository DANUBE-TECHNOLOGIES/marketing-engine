"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  collectExposedDestinationSlugs,
} = require("./destination-exposure");

test("collects only slugs actually resolved in destination blocks", () => {
  const result = collectExposedDestinationSlugs([
    {
      blocks: [
        {
          blockType: "destinations",
          content: {
            destinations: [
              { slug: "sicile" },
              { slug: "maldives" },
            ],
          },
        },
        {
          blockType: "text",
          content: { items: [{ slug: "japon" }] },
        },
      ],
    },
  ]);

  assert.deepEqual(result, ["sicile", "maldives"]);
});

test("aligns exposure with all destination block types accepted by sitemap", () => {
  const result = collectExposedDestinationSlugs([
    {
      blocks: [
        { blockType: "destination-grid", content: { items: [{ slug: "canaries" }] } },
        { blockType: "destinations-highlight", content: { items: [{ slug: "ile-maurice" }] } },
        { blockType: "destination-recommendations", content: { destinations: [{ slug: "seychelles" }] } },
      ],
    },
  ]);

  assert.deepEqual(result, ["canaries", "ile-maurice", "seychelles"]);
});

test("extracts destination slug from destination links", () => {
  const result = collectExposedDestinationSlugs([
    {
      blocks: [
        {
          blockType: "destination-grid",
          content: {
            items: [
              { href: "/destinations/republique-dominicaine" },
              { url: "https://example.test/destination/thailande?from=home" },
            ],
          },
        },
      ],
    },
  ]);

  assert.deepEqual(result, ["republique-dominicaine", "thailande"]);
});

test("deduplicates destinations across published pages", () => {
  const result = collectExposedDestinationSlugs([
    {
      blocks: [
        {
          blockType: "destinations",
          content: { items: [{ slug: "sicile" }] },
        },
      ],
    },
    {
      blocks: [
        {
          blockType: "destination-grid",
          content: {
            destinations: [{ slug: "sicile" }, { slug: "crete" }],
          },
        },
      ],
    },
  ]);

  assert.deepEqual(result, ["sicile", "crete"]);
});

test("ignores unresolved destination references", () => {
  const result = collectExposedDestinationSlugs([
    {
      blocks: [
        {
          blockType: "destinations",
          content: {
            destinationIds: ["destination-1"],
            destinations: [],
          },
        },
      ],
    },
  ]);

  assert.deepEqual(result, []);
});
