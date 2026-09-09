"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GoogleBusinessReviewsService,
  latestReviewPublishedAt,
} = require("../src/modules/google-business-reviews/service");

function review(id, rating, publishedAt) {
  return {
    id,
    agencyId: 12,
    authorName: `Client ${id}`,
    rating,
    comment: `Avis ${id}`,
    reply: null,
    status: "new",
    source: "google",
    googleReviewId: `google-${id}`,
    publishedAt: new Date(publishedAt),
    createdAt: new Date(publishedAt),
  };
}

function repository(rows) {
  return {
    async findPublicSite() {
      return {
        agency: {
          id: 12,
          name: "Mondescale Test",
          city: "Testville",
          googleReviewUrl: "https://example.test/review",
        },
      };
    },
    async listPublicReviews() {
      return [...rows].sort((a, b) => b.publishedAt - a.publishedAt);
    },
  };
}

test("MSE-25.151 latestPublishedAt is computed from the complete synchronized snapshot before card limiting", async () => {
  const rows = [
    review(1, 5, "2026-09-01T10:00:00.000Z"),
    review(2, 4, "2026-09-10T10:00:00.000Z"),
    review(3, 5, "2026-09-20T10:00:00.000Z"),
    review(4, 5, "2026-09-15T10:00:00.000Z"),
  ];
  const service = new GoogleBusinessReviewsService(repository(rows), {});

  const oneCard = await service.getPublic("testville", "mondescale", 1);
  const threeCards = await service.getPublic("testville", "mondescale", 3);

  assert.equal(oneCard.reviews.length, 1);
  assert.equal(threeCards.reviews.length, 3);
  assert.equal(oneCard.summary.total, 4);
  assert.equal(threeCards.summary.total, 4);
  assert.equal(oneCard.summary.averageRating, 4.8);
  assert.equal(threeCards.summary.averageRating, 4.8);
  assert.equal(oneCard.summary.latestPublishedAt, "2026-09-20T10:00:00.000Z");
  assert.equal(threeCards.summary.latestPublishedAt, "2026-09-20T10:00:00.000Z");
});

test("MSE-25.151 freshness helper ignores invalid dates and falls back from publishedAt to createdAt", () => {
  const result = latestReviewPublishedAt([
    { publishedAt: "invalid", createdAt: "2026-09-30T08:00:00.000Z" },
    { publishedAt: null, createdAt: "2026-09-25T08:00:00.000Z" },
    { publishedAt: "2026-09-28T08:00:00.000Z", createdAt: "2026-09-28T08:00:00.000Z" },
  ]);

  assert.equal(result, "2026-09-28T08:00:00.000Z");
});
