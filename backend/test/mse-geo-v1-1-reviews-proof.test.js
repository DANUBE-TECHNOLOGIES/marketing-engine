"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GoogleBusinessReviewsService,
  buildReviewProof,
} = require("../src/modules/google-business-reviews/service");

function row(id, overrides = {}) {
  return {
    id,
    agencyId: 12,
    authorName: `Client ${id}`,
    rating: 5,
    comment: `Avis ${id}`,
    reply: null,
    status: "new",
    source: "google",
    googleReviewId: `google-${id}`,
    publishedAt: new Date(`2026-09-${String(id).padStart(2, "0")}T10:00:00.000Z`),
    createdAt: new Date(`2026-09-${String(id).padStart(2, "0")}T11:00:00.000Z`),
    updatedAt: new Date(`2026-09-${String(id).padStart(2, "0")}T12:00:00.000Z`),
    ...overrides,
  };
}

function repository(rows) {
  return {
    async findPublicSite() {
      return {
        agency: {
          id: 12,
          name: "Mondescale Maurepas",
          city: "Maurepas",
          googleReviewUrl: "https://example.test/google-reviews",
        },
      };
    },
    async listPublicReviews() {
      return rows;
    },
  };
}

test("MSE-GEO V1.1 le proof porte sur le snapshot complet et non sur les cartes affichées", async () => {
  const rows = Array.from({ length: 8 }, (_, index) =>
    row(index + 1, { rating: index === 0 ? 4 : 5 })
  );
  const service = new GoogleBusinessReviewsService(repository(rows), {
    async listReviews() {
      throw new Error("Le rendu public ne doit pas appeler Google");
    },
  });

  const result = await service.getPublic("maurepas", "mondescale", 3);

  assert.equal(result.reviews.length, 3);
  assert.equal(result.summary.total, 8);
  assert.equal(result.summary.averageRating, 4.9);
  assert.equal(result.proof.total, 8);
  assert.equal(result.proof.averageRating, 4.9);
  assert.equal(result.proof.source, "google");
  assert.equal(result.proof.provider, "google_business_profile");
  assert.equal(result.proof.completeness, "best-effort");
  assert.equal(result.proof.sourceUrl, "https://example.test/google-reviews");
});

test("MSE-GEO V1.1 les doublons Google sont exclus du proof", async () => {
  const rows = [
    row(1, { googleReviewId: "duplicate" }),
    row(2, { googleReviewId: "duplicate", rating: 1 }),
    row(3, { googleReviewId: "unique", rating: 4 }),
  ];
  const service = new GoogleBusinessReviewsService(repository(rows), {});

  const result = await service.getPublic("maurepas", "mondescale", 6);

  assert.equal(result.proof.total, 2);
  assert.equal(result.proof.averageRating, 4.5);
});

test("MSE-GEO V1.1 le proof expose uniquement des dates factuelles du snapshot", () => {
  const proof = buildReviewProof(
    [
      row(1, {
        publishedAt: new Date("2026-08-15T10:00:00.000Z"),
        updatedAt: new Date("2026-09-01T12:00:00.000Z"),
      }),
      row(2, {
        publishedAt: new Date("2026-09-05T10:00:00.000Z"),
        updatedAt: new Date("2026-09-06T12:00:00.000Z"),
      }),
    ],
    { source: "google", sourceUrl: "https://example.test/reviews" }
  );

  assert.equal(proof.kind, "ReviewProof");
  assert.equal(proof.version, "1.0.0");
  assert.equal(proof.provider, "google_business_profile");
  assert.equal(proof.completeness, "best-effort");
  assert.equal(proof.latestReviewPublishedAt, "2026-09-05T10:00:00.000Z");
  assert.equal(proof.snapshotLastChangedAt, "2026-09-06T12:00:00.000Z");
  assert.equal(Object.prototype.hasOwnProperty.call(proof, "lastVerifiedAt"), false);
});

test("MSE-GEO V1.1 sans snapshot Google la provenance reste explicitement locale", async () => {
  const rows = [
    row(1, {
      source: "manual",
      googleReviewId: null,
      rating: 5,
    }),
    row(2, {
      source: "legacy",
      googleReviewId: null,
      rating: 4,
    }),
  ];
  const service = new GoogleBusinessReviewsService(repository(rows), {});

  const result = await service.getPublic("maurepas", "mondescale", 1);

  assert.equal(result.reviews.length, 1);
  assert.equal(result.proof.source, "local-fallback");
  assert.equal(result.proof.provider, null);
  assert.equal(result.proof.completeness, "local-fallback");
  assert.equal(result.proof.total, 2);
  assert.equal(result.proof.averageRating, 4.5);
});

test("MSE-GEO V1.1 un snapshot vide produit un proof neutre et déterministe", () => {
  const proof = buildReviewProof([], { source: "local-fallback" });

  assert.deepEqual(proof, {
    kind: "ReviewProof",
    version: "1.0.0",
    source: "local-fallback",
    provider: null,
    completeness: "local-fallback",
    sourceUrl: null,
    averageRating: 0,
    total: 0,
    latestReviewPublishedAt: null,
    snapshotLastChangedAt: null,
  });
});
