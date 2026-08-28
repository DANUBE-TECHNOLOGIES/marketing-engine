"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DESTINATION_BLOCK_TYPES,
  collectExposedDestinationSlugs,
} = require("../src/modules/public-site-read/destination-exposure");

test("MSE-25.81 keeps public destination exposure aligned with sitemap block families", () => {
  assert.deepEqual([...DESTINATION_BLOCK_TYPES].sort(), [
    "destination-grid",
    "destination-recommendations",
    "destinations",
    "destinations-highlight",
  ]);

  const pages = [{
    blocks: [
      { blockType: "destination-grid", content: { items: [{ slug: "canaries" }, { slug: "maldives" }] } },
      { blockType: "destinations-highlight", content: { items: [{ href: "/destination/seychelles" }] } },
      { blockType: "destination-recommendations", content: { destinations: [{ slug: "thailande" }] } },
    ],
  }];

  assert.deepEqual(collectExposedDestinationSlugs(pages), [
    "canaries",
    "maldives",
    "seychelles",
    "thailande",
  ]);
});
