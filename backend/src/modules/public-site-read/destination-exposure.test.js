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
          blockType: "destinations",
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
