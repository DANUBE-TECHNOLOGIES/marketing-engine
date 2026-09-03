"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  filterPublicBlocks,
  hydratePublicDynamicBlocks,
} = require(
  "../src/modules/public-site-read/dynamic-block-hydrator"
);

function block(id, status) {
  return {
    id,
    type: "rich_text",
    blockType: "rich_text",
    status,
    content: {
      title: id,
    },
  };
}

test("MSE-25.3 le live exclut draft review hidden et archived", () => {
  const pages = filterPublicBlocks([
    {
      id: "home",
      blocks: [
        block("published", "published"),
        block("visible", "visible"),
        block("legacy", null),
        block("draft", "draft"),
        block("review", "review"),
        block("hidden", "hidden"),
        block("archived", "archived"),
      ],
    },
  ]);

  assert.deepEqual(
    pages[0].blocks.map((item) => item.id),
    ["published", "visible", "legacy"]
  );
});

test("MSE-25.3 l'hydrateur live applique le filtre même sans bloc dynamique", async () => {
  const pages = await hydratePublicDynamicBlocks({
    prisma: {},
    tenantId: "tenant-a",
    agencyId: 1,
    pages: [
      {
        id: "home",
        blocks: [
          block("published", "published"),
          block("draft", "draft"),
        ],
      },
    ],
  });

  assert.deepEqual(
    pages[0].blocks.map((item) => item.id),
    ["published"]
  );
});

test("MSE-25.3 la preview conserve explicitement les blocs brouillon", async () => {
  const pages = await hydratePublicDynamicBlocks({
    prisma: {},
    tenantId: "tenant-a",
    agencyId: 1,
    includeUnpublishedBlocks: true,
    pages: [
      {
        id: "home",
        blocks: [
          block("published", "published"),
          block("draft", "draft"),
          block("review", "review"),
        ],
      },
    ],
  });

  assert.deepEqual(
    pages[0].blocks.map((item) => item.id),
    ["published", "draft", "review"]
  );
});
