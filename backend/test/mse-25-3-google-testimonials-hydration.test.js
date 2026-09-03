"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hydratePublicDynamicBlocks,
} = require(
  "../src/modules/public-site-read/dynamic-block-hydrator"
);

function testimonialBlock({
  source = "google",
  limit = 2,
  items = [],
} = {}) {
  return {
    id: `testimonials-${source}`,
    type: "testimonials",
    blockType: "testimonials",
    content: {
      title: "Ils nous font confiance",
      source,
      limit,
      items,
    },
  };
}

test("MSE-25.3 hydrate les avis Google publiés de l'agence et respecte la limite V2", async () => {
  let query = null;

  const prisma = {
    googleReview: {
      async findMany(input) {
        query = input;

        return [
          {
            id: 10,
            agencyId: 42,
            authorName: "Alice",
            rating: 5,
            comment: "Très bonne agence.",
            publishedAt: new Date("2026-08-03T10:00:00.000Z"),
            status: "new",
          },
          {
            id: 11,
            agencyId: 42,
            authorName: "Bob",
            rating: 4,
            comment: "Très bons conseils.",
            publishedAt: new Date("2026-08-02T10:00:00.000Z"),
            status: "replied",
          },
          {
            id: 12,
            agencyId: 42,
            authorName: "Claire",
            rating: 5,
            comment: "Excellent suivi.",
            publishedAt: new Date("2026-08-01T10:00:00.000Z"),
            status: "pending_validation",
          },
        ];
      },
    },
  };

  const pages = await hydratePublicDynamicBlocks({
    prisma,
    tenantId: "tenant-a",
    agencyId: 42,
    pages: [
      {
        id: "home",
        blocks: [
          testimonialBlock({ limit: 2 }),
        ],
      },
    ],
  });

  assert.equal(query.where.agencyId, 42);
  assert.equal(query.where.comment.not, null);
  assert.equal(query.where.publishedAt.not, null);
  assert.equal(query.where.status, undefined);
  assert.equal(query.take, 2);

  assert.deepEqual(
    pages[0].blocks[0].content.items,
    [
      {
        id: 10,
        author: "Alice",
        rating: 5,
        text: "Très bonne agence.",
      },
      {
        id: 11,
        author: "Bob",
        rating: 4,
        text: "Très bons conseils.",
      },
    ]
  );
});

test("MSE-25.3 ne remplace jamais les témoignages manuels", async () => {
  const manualItems = [
    {
      author: "Cliente test",
      rating: 5,
      text: "Témoignage éditorial validé.",
    },
  ];

  let reviewQueryCount = 0;

  const pages = await hydratePublicDynamicBlocks({
    prisma: {
      googleReview: {
        async findMany() {
          reviewQueryCount += 1;
          return [];
        },
      },
    },
    agencyId: 42,
    pages: [
      {
        id: "home",
        blocks: [
          testimonialBlock({
            source: "manual",
            items: manualItems,
          }),
        ],
      },
    ],
  });

  assert.equal(reviewQueryCount, 0);
  assert.deepEqual(
    pages[0].blocks[0].content.items,
    manualItems
  );
});
