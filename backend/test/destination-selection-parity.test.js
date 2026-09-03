"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hydrateDestinationBlocks,
} = require("../src/modules/public-site-read/dynamic-block-hydrator");
const {
  selectDestinationSlugsForBlock,
} = require("../src/modules/public-site-read/destination-selection");

const catalog = [
  { id: "dest-fr", slug: "france", name: "France" },
  { id: "dest-jp", slug: "japon", name: "Japon" },
  { id: "dest-mv", slug: "maldives", name: "Maldives" },
  { id: "dest-si", slug: "sicile", name: "Sicile" },
];

function hydratedSlugs(block, manualDestinations, automaticDestinations) {
  const pages = hydrateDestinationBlocks(
    [{ slug: "home", blocks: [block] }],
    manualDestinations,
    automaticDestinations
  );

  return (pages[0].blocks[0].content.destinations || []).map((item) => item.slug);
}

test("manual destination selection stays identical between renderer and sitemap contract", () => {
  const block = {
    blockType: "destinations",
    content: {
      source: "manual",
      selectionMode: "manual",
      destinationIds: ["dest-si", "dest-fr"],
      limit: 2,
    },
  };

  const renderer = hydratedSlugs(block, catalog, []);
  const sitemap = selectDestinationSlugsForBlock(block, catalog);

  assert.deepEqual(sitemap, renderer);
  assert.deepEqual(sitemap, ["sicile", "france"]);
});

test("automatic destination selection stays identical between renderer and sitemap contract", () => {
  const block = {
    blockType: "destinations",
    content: {
      source: "travel-core",
      selectionMode: "automatic",
      limit: 2,
    },
  };

  const renderer = hydratedSlugs(block, [], catalog);
  const sitemap = selectDestinationSlugsForBlock(block, catalog);

  assert.deepEqual(sitemap, renderer);
  assert.deepEqual(sitemap, ["france", "japon"]);
});

test("manual references may resolve by destination slug as well as id", () => {
  const block = {
    blockType: "destinations",
    content: {
      selectionMode: "manual",
      destinationIds: ["maldives", "dest-si"],
      limit: 6,
    },
  };

  assert.deepEqual(
    selectDestinationSlugsForBlock(block, catalog),
    ["maldives", "sicile"]
  );
});