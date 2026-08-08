"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hydratePublicDynamicBlocks,
} = require(
  "../src/modules/public-site-read/dynamic-block-hydrator"
);

function destinationBlock(destinationIds) {
  return {
    id: "destinations-1",
    type: "destinations",
    blockType: "destinations",
    content: {
      title: "Nos destinations",
      destinationIds,
    },
  };
}

test("MSE-25.3 hydrate les destinations publiées dans l'ordre configuré par V2", async () => {
  const calls = [];

  const prisma = {
    destination: {
      async findMany(query) {
        calls.push(query);

        return [
          {
            id: "dest-2",
            tenantId: "tenant-a",
            status: "published",
            slug: "maldives",
            name: "Maldives",
            country: "Maldives",
            summary: "Lagons et plages.",
            heroImageUrl: "https://example.test/maldives.jpg",
          },
          {
            id: "dest-1",
            tenantId: "tenant-a",
            status: "published",
            slug: "maurice",
            name: "Île Maurice",
            country: "Maurice",
            summary: "Une île à découvrir.",
            heroImageUrl: "https://example.test/maurice.jpg",
          },
        ];
      },
    },
  };

  const pages = await hydratePublicDynamicBlocks({
    prisma,
    tenantId: "tenant-a",
    pages: [
      {
        id: "home",
        blocks: [
          destinationBlock([
            "dest-1",
            "maldives",
          ]),
        ],
      },
    ],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].where.tenantId, "tenant-a");
  assert.equal(calls[0].where.status, "published");

  assert.deepEqual(
    pages[0].blocks[0].content.destinations.map((item) => item.slug),
    ["maurice", "maldives"]
  );

  assert.equal(
    pages[0].blocks[0].content.destinations[0].title,
    "Île Maurice"
  );
});

test("MSE-25.3 ne résout jamais les destinations hors tenant ou non publiées", async () => {
  let where = null;

  const prisma = {
    destination: {
      async findMany(query) {
        where = query.where;
        return [];
      },
    },
  };

  const pages = await hydratePublicDynamicBlocks({
    prisma,
    tenantId: "tenant-safe",
    pages: [
      {
        id: "home",
        blocks: [
          destinationBlock([
            "foreign-destination",
            "draft-destination",
          ]),
        ],
      },
    ],
  });

  assert.equal(where.tenantId, "tenant-safe");
  assert.equal(where.status, "published");
  assert.deepEqual(
    pages[0].blocks[0].content.destinations,
    []
  );
});

test("MSE-25.3 laisse les blocs non dynamiques inchangés", async () => {
  const original = {
    id: "page-1",
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        content: {
          title: "Bienvenue",
        },
      },
    ],
  };

  const pages = await hydratePublicDynamicBlocks({
    prisma: {},
    tenantId: "tenant-a",
    pages: [original],
  });

  assert.equal(pages[0], original);
});
