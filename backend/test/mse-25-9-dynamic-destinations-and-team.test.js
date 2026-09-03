"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const hydrator = require("../src/modules/public-site-read/dynamic-block-hydrator");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 plans automatic destinations without manual ids", () => {
  const plan = hydrator.collectDestinationPlan([
    {
      blocks: [
        {
          type: "destinations",
          status: "published",
          content: {
            source: "automatic",
            limit: 4,
          },
        },
      ],
    },
  ]);

  assert.deepEqual(plan.references, []);
  assert.equal(plan.automaticLimit, 4);
});

test("MSE-25.9 hydrates automatic destination cards", () => {
  const pages = hydrator.hydrateDestinationBlocks(
    [
      {
        blocks: [
          {
            type: "destinations",
            status: "published",
            content: {
              source: "automatic",
              limit: 2,
            },
          },
        ],
      },
    ],
    [],
    [
      { id: "d1", slug: "sicile", name: "Sicile", country: "Italie" },
      { id: "d2", slug: "maurice", name: "Île Maurice", country: "Maurice" },
      { id: "d3", slug: "maldives", name: "Maldives", country: "Maldives" },
    ]
  );

  assert.equal(pages[0].blocks[0].content.destinations.length, 2);
  assert.equal(pages[0].blocks[0].content.items[0].slug, "sicile");
});

test("MSE-25.9 registers a dedicated public team renderer", () => {
  const registry = read("frontend/components/public-site/renderers/registry.js");
  const team = read("frontend/components/public-site/renderers/TeamRenderer.js");

  assert.match(registry, /team:\s*TeamRenderer/);
  assert.match(team, /public-site-team-grid/);
  assert.match(team, /showWhenEmpty/);
});

test("MSE-25.9 does not render empty destination or inspiration placeholders by default", () => {
  const destinations = read("frontend/components/public-site/renderers/DestinationsRenderer.js");
  const inspirations = read("frontend/components/public-site/renderers/InspirationsRenderer.js");

  assert.match(destinations, /if \(!items\.length && content\.showWhenEmpty !== true\)/);
  assert.match(inspirations, /if \(!items\.length && content\.showWhenEmpty !== true\)/);
});
