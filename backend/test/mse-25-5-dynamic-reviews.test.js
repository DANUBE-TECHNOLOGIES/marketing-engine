"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isGoogleReviewBlock,
  googleReviewLimit,
  hydratePublicDynamicBlocks,
} = require(
  "../src/modules/public-site-read/dynamic-block-hydrator"
);

function reviewBlock({
  limit = 3,
  source,
  dataSource = "google-reviews",
} = {}) {
  return {
    id: "reviews-google",
    type: "reviews",
    blockType: "reviews",
    settings: {
      __dataSource: dataSource,
    },
    content: {
      title: "Ils nous ont confié leurs voyages",
      ...(source ? { source } : {}),
      limit,
      reviews: [],
    },
  };
}

test(
  "MSE-25.5 reconnaît le bloc reviews du Website Designer comme source Google",
  () => {
    const block = reviewBlock();

    assert.equal(
      isGoogleReviewBlock(block),
      true
    );

    assert.equal(
      googleReviewLimit([
        {
          id: "home",
          blocks: [block],
        },
      ]),
      3
    );
  }
);

test(
  "MSE-25.5 hydrate le bloc reviews du Website Designer avec les avis de l'agence",
  async () => {
    let query = null;

    const prisma = {
      googleReview: {
        async findMany(input) {
          query = input;

          return [
            {
              id: 101,
              agencyId: 42,
              authorName: "Alice",
              rating: 5,
              comment: "Excellent accompagnement.",
              reply: "Merci Alice.",
              publishedAt:
                new Date("2026-08-08T10:00:00.000Z"),
              createdAt:
                new Date("2026-08-08T10:00:00.000Z"),
            },
            {
              id: 102,
              agencyId: 42,
              authorName: "Bob",
              rating: 4,
              comment: "Très bons conseils.",
              reply: null,
              publishedAt:
                new Date("2026-08-07T10:00:00.000Z"),
              createdAt:
                new Date("2026-08-07T10:00:00.000Z"),
            },
          ];
        },
      },
    };

    const pages =
      await hydratePublicDynamicBlocks({
        prisma,
        tenantId: "tenant-a",
        agencyId: 42,
        pages: [
          {
            id: "home",
            blocks: [
              reviewBlock({
                limit: 2,
              }),
            ],
          },
        ],
      });

    assert.equal(
      query.where.agencyId,
      42
    );

    assert.equal(
      query.where.comment.not,
      null
    );

    assert.equal(
      query.where.publishedAt.not,
      null
    );

    assert.equal(
      query.take,
      2
    );

    const content =
      pages[0].blocks[0].content;

    assert.equal(
      content.reviews.length,
      2
    );

    assert.equal(
      content.reviews[0].authorName,
      "Alice"
    );

    assert.equal(
      content.reviews[0].reply,
      "Merci Alice."
    );

    assert.deepEqual(
      content.items,
      [
        {
          id: 101,
          author: "Alice",
          rating: 5,
          text: "Excellent accompagnement.",
        },
        {
          id: 102,
          author: "Bob",
          rating: 4,
          text: "Très bons conseils.",
        },
      ]
    );
  }
);

test(
  "MSE-25.5 conserve la compatibilité testimonials Google MSE-25.3",
  async () => {
    const pages =
      await hydratePublicDynamicBlocks({
        prisma: {
          googleReview: {
            async findMany() {
              return [
                {
                  id: 201,
                  agencyId: 42,
                  authorName: "Claire",
                  rating: 5,
                  comment: "Parfait.",
                  publishedAt:
                    new Date("2026-08-06T10:00:00.000Z"),
                  createdAt:
                    new Date("2026-08-06T10:00:00.000Z"),
                },
              ];
            },
          },
        },
        agencyId: 42,
        pages: [
          {
            id: "home",
            blocks: [
              {
                id: "legacy-testimonials",
                type: "testimonials",
                blockType: "testimonials",
                content: {
                  source: "google",
                  limit: 1,
                  items: [],
                },
              },
            ],
          },
        ],
      });

    assert.deepEqual(
      pages[0].blocks[0].content.items,
      [
        {
          id: 201,
          author: "Claire",
          rating: 5,
          text: "Parfait.",
        },
      ]
    );
  }
);

test(
  "MSE-25.5 ne considère pas une section reviews manuelle comme Google",
  async () => {
    let queries = 0;

    const original = [
      {
        id: "manual-review",
        authorName: "Cliente éditoriale",
        rating: 5,
        comment: "Avis sélectionné manuellement.",
      },
    ];

    const pages =
      await hydratePublicDynamicBlocks({
        prisma: {
          googleReview: {
            async findMany() {
              queries += 1;
              return [];
            },
          },
        },
        agencyId: 42,
        pages: [
          {
            id: "home",
            blocks: [
              {
                ...reviewBlock({
                  source: "manual",
                  dataSource: "manual",
                }),
                content: {
                  source: "manual",
                  limit: 3,
                  reviews: original,
                },
              },
            ],
          },
        ],
      });

    assert.equal(queries, 0);

    assert.deepEqual(
      pages[0].blocks[0].content.reviews,
      original
    );
  }
);
