"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { AiContentService } = require("../src/modules/ai-content/service");

function repository(initial = {}) {
  const contents = new Map(
    Object.entries(initial).map(([id, content]) => [
      id,
      {
        id,
        tenantId: "tenant_mondescale",
        channel: "article",
        status: "review",
        publishedAt: null,
        ...content,
      },
    ])
  );

  return {
    createJob: async () => null,
    getContent: async id => contents.get(String(id)) || null,
    updateContent: async (id, data) => {
      const current = contents.get(String(id));
      const updated = { ...current, ...data };
      contents.set(String(id), updated);
      return updated;
    },
  };
}

test("MSE-25.7 publie explicitement un SeoContent autonome en review", async () => {
  const service = new AiContentService(
    repository({
      "content-1": {
        title: "Maurice en hiver",
        status: "review",
      },
    }),
    "tenant_mondescale"
  );

  const result = await service.publishContent("content-1");

  assert.equal(result.status, "published");
  assert.ok(result.publishedAt instanceof Date);
});

test("MSE-25.7 rend la publication idempotente", async () => {
  const publishedAt = new Date("2026-08-09T12:00:00.000Z");
  const service = new AiContentService(
    repository({
      "content-1": {
        status: "published",
        publishedAt,
      },
    }),
    "tenant_mondescale"
  );

  const result = await service.publishContent("content-1");

  assert.equal(result.status, "published");
  assert.equal(result.publishedAt, publishedAt);
});

test("MSE-25.7 refuse de publier un contenu dans un état invalide", async () => {
  const service = new AiContentService(
    repository({
      "content-1": {
        status: "archived",
      },
    }),
    "tenant_mondescale"
  );

  await assert.rejects(
    () => service.publishContent("content-1"),
    error => error.code === "AI_CONTENT_NOT_PUBLISHABLE" && error.statusCode === 409
  );
});

test("MSE-25.7 interdit de contourner le Campaign Manager pour publier un contenu de campagne", async () => {
  const service = new AiContentService(
    repository({
      "content-1": {
        campaignId: "campaign-1",
        status: "review",
      },
    }),
    "tenant_mondescale"
  );

  await assert.rejects(
    () => service.publishContent("content-1"),
    error =>
      error.code === "AI_CONTENT_CAMPAIGN_REVIEW_REQUIRED" &&
      error.statusCode === 409
  );
});

test("MSE-25.7 retire un contenu autonome publié du catalogue sans supprimer son publishedAt", async () => {
  const publishedAt = new Date("2026-08-09T12:00:00.000Z");
  const service = new AiContentService(
    repository({
      "content-1": {
        status: "published",
        publishedAt,
      },
    }),
    "tenant_mondescale"
  );

  const result = await service.unpublishContent("content-1");

  assert.equal(result.status, "review");
  assert.equal(result.publishedAt, publishedAt);
});

test("MSE-25.7 interdit de dépublier directement un contenu piloté par une campagne", async () => {
  const service = new AiContentService(
    repository({
      "content-1": {
        campaignId: "campaign-1",
        status: "published",
        publishedAt: new Date("2026-08-09T12:00:00.000Z"),
      },
    }),
    "tenant_mondescale"
  );

  await assert.rejects(
    () => service.unpublishContent("content-1"),
    error =>
      error.code === "AI_CONTENT_CAMPAIGN_REVIEW_REQUIRED" &&
      error.statusCode === 409
  );
});

test("MSE-25.7 renvoie 404 pour un contenu absent du tenant", async () => {
  const service = new AiContentService(
    repository({}),
    "tenant_mondescale"
  );

  await assert.rejects(
    () => service.publishContent("foreign-content"),
    error => error.code === "AI_CONTENT_NOT_FOUND" && error.statusCode === 404
  );
});
