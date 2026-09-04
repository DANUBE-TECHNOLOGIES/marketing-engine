"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GoogleBusinessReviewsService,
} = require("../src/modules/google-business-reviews/service");

function googleReview(id, rating = "FIVE", overrides = {}) {
  return {
    reviewId: id,
    reviewer: { displayName: `Auteur ${id}` },
    starRating: rating,
    comment: `Avis ${id}`,
    createTime: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

function createMemoryRepository(initial = []) {
  const rows = initial.map((row) => ({ ...row }));
  let nextId = Math.max(0, ...rows.map((row) => row.id || 0)) + 1;
  const writes = { create: 0, update: 0 };

  return {
    rows,
    writes,
    async findTenantBySlug(slug) {
      return slug === "mondescale" ? { id: "tenant-1", slug } : null;
    },
    async listGoogleAgencies() {
      return [
        {
          id: 12,
          tenantId: "tenant-1",
          name: "Mondescale Test",
          city: "Testville",
          googleLocationId: "locations/123",
        },
      ];
    },
    async findKnownReviews(agencyId, googleReviewId) {
      return rows
        .filter(
          (row) =>
            row.agencyId === Number(agencyId) &&
            row.googleReviewId === googleReviewId
        )
        .sort((a, b) => a.id - b.id);
    },
    async createReview(data) {
      writes.create++;
      const row = {
        id: nextId++,
        createdAt: new Date("2026-09-01T11:00:00.000Z"),
        updatedAt: new Date("2026-09-01T11:00:00.000Z"),
        ...data,
      };
      rows.push(row);
      return row;
    },
    async updateReview(id, data) {
      writes.update++;
      const row = rows.find((item) => item.id === id);
      Object.assign(row, data);
      return row;
    },
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
      return rows
        .filter((row) => row.agencyId === 12 && row.rating >= 1)
        .sort((a, b) => {
          const left = new Date(a.publishedAt || a.createdAt || 0).getTime();
          const right = new Date(b.publishedAt || b.createdAt || 0).getTime();
          return right - left || b.id - a.id;
        });
    },
  };
}

test("MSE-25.124 synchroniser deux fois le même payload ne réécrit pas les avis", async () => {
  const repository = createMemoryRepository();
  const payload = [googleReview("r-1"), googleReview("r-2", "FOUR")];
  const provider = { async listReviews() { return payload; } };
  const service = new GoogleBusinessReviewsService(repository, provider);

  const first = await service.syncTenant("mondescale");
  assert.equal(first.imported, 2);
  assert.equal(repository.rows.length, 2);

  const second = await service.syncTenant("mondescale");
  assert.equal(second.imported, 0);
  assert.equal(second.reconciled, 0);
  assert.equal(second.unchanged, 2);
  assert.equal(repository.rows.length, 2);
  assert.deepEqual(repository.writes, { create: 2, update: 0 });
});

test("MSE-25.124 un avis Google connu est mis à jour au lieu d'être recréé", async () => {
  const repository = createMemoryRepository([
    {
      id: 4,
      agencyId: 12,
      authorName: "Ancien auteur",
      rating: 3,
      comment: "Ancien texte",
      reply: null,
      status: "new",
      source: "google",
      googleReviewId: "r-1",
      publishedAt: new Date("2026-08-01T10:00:00.000Z"),
      createdAt: new Date("2026-08-01T10:00:00.000Z"),
    },
  ]);
  const provider = {
    async listReviews() {
      return [
        googleReview("r-1", "FIVE", {
          reviewer: { displayName: "Nouvel auteur" },
          comment: "Texte corrigé",
          createTime: "2026-09-02T10:00:00.000Z",
          reviewReply: { comment: "Merci !" },
        }),
      ];
    },
  };
  const service = new GoogleBusinessReviewsService(repository, provider);

  const result = await service.syncTenant("mondescale");
  assert.equal(result.imported, 0);
  assert.equal(result.reconciled, 1);
  assert.equal(repository.rows.length, 1);
  assert.equal(repository.rows[0].authorName, "Nouvel auteur");
  assert.equal(repository.rows[0].rating, 5);
  assert.equal(repository.rows[0].comment, "Texte corrigé");
  assert.equal(repository.rows[0].reply, "Merci !");
  assert.equal(repository.rows[0].status, "replied");
});

test("MSE-25.124 une panne Google conserve intégralement le snapshot local", async () => {
  const repository = createMemoryRepository([
    {
      id: 7,
      agencyId: 12,
      authorName: "Client existant",
      rating: 5,
      comment: "Conservé",
      reply: null,
      status: "new",
      source: "google",
      googleReviewId: "r-existing",
      publishedAt: new Date("2026-08-20T10:00:00.000Z"),
      createdAt: new Date("2026-08-20T10:00:00.000Z"),
    },
  ]);
  const before = JSON.stringify(repository.rows);
  const provider = { async listReviews() { throw new Error("Google 503"); } };
  const service = new GoogleBusinessReviewsService(repository, provider);

  const result = await service.syncTenant("mondescale");
  assert.equal(result.success, false);
  assert.equal(result.failed, 1);
  assert.equal(JSON.stringify(repository.rows), before);
  assert.deepEqual(repository.writes, { create: 0, update: 0 });
});

test("MSE-25.124 la synthèse publique porte sur tout le snapshot et non sur les cartes", async () => {
  const rows = Array.from({ length: 17 }, (_, index) => ({
    id: index + 1,
    agencyId: 12,
    authorName: `Client ${index + 1}`,
    rating: index === 0 ? 4 : 5,
    comment: `Avis ${index + 1}`,
    reply: null,
    status: "new",
    source: "google",
    googleReviewId: `r-${index + 1}`,
    publishedAt: new Date(Date.UTC(2026, 8, 1 + index)),
    createdAt: new Date(Date.UTC(2026, 8, 1 + index)),
  }));
  const repository = createMemoryRepository(rows);
  const service = new GoogleBusinessReviewsService(repository, {
    async listReviews() { throw new Error("Le rendu public ne doit jamais appeler Google"); },
  });

  const three = await service.getPublic("testville", "mondescale", 3);
  const six = await service.getPublic("testville", "mondescale", 6);

  assert.equal(three.summary.total, 17);
  assert.equal(six.summary.total, 17);
  assert.equal(three.summary.averageRating, 4.9);
  assert.equal(six.summary.averageRating, 4.9);
  assert.equal(three.reviews.length, 3);
  assert.equal(six.reviews.length, 6);
});

test("MSE-25.124 les doublons historiques Google ne gonflent pas la synthèse publique", async () => {
  const base = {
    agencyId: 12,
    authorName: "Client",
    rating: 5,
    comment: "Avis",
    reply: null,
    status: "new",
    source: "google",
    googleReviewId: "r-duplicate",
    publishedAt: new Date("2026-09-01T10:00:00.000Z"),
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
  };
  const repository = createMemoryRepository([
    { id: 1, ...base },
    { id: 2, ...base },
    { id: 3, ...base, googleReviewId: "r-other", rating: 4 },
  ]);
  const service = new GoogleBusinessReviewsService(repository, {});

  const result = await service.getPublic("testville", "mondescale", 6);
  assert.equal(result.summary.total, 2);
  assert.equal(result.summary.averageRating, 4.5);
  assert.equal(result.reviews.length, 2);
});
