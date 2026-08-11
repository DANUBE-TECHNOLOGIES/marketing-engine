"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AiContentService,
  assertEditorialCanonicalIsPublishable,
} = require("../src/modules/ai-content/service");
const AiContentRepository = require("../src/modules/ai-content/repository");

function localContent(overrides = {}) {
  return {
    id: "content-1",
    status: "review",
    campaignId: null,
    seo: {
      editorialTargeting: {
        scope: "agencies",
        agencyIds: ["3", "6"],
        indexAgencyId: "6",
      },
    },
    ...overrides,
  };
}

test("MSE-25.9 blocks local editorial publication when the canonical mini-site is not published", async () => {
  let updated = false;
  const repo = {
    createJob() {},
    getContent: async () => localContent(),
    getPublishedAgencySiteByAgencyId: async (agencyId) => {
      assert.equal(String(agencyId), "6");
      return null;
    },
    updateContent: async () => {
      updated = true;
      return null;
    },
  };

  const service = new AiContentService(repo, "tenant-mondescale", {
    provider: { name: "test-provider" },
  });

  await assert.rejects(
    () => service.publishContent("content-1"),
    (error) => error?.code === "AI_CONTENT_CANONICAL_SITE_NOT_PUBLISHED" && error?.statusCode === 409
  );
  assert.equal(updated, false);
});

test("MSE-25.9 publishes local editorial content when its canonical mini-site is public", async () => {
  const updates = [];
  const repo = {
    createJob() {},
    getContent: async () => localContent(),
    getPublishedAgencySiteByAgencyId: async () => ({
      id: "site-bois",
      agencyId: 6,
      slug: "bois-colombes",
      status: "published",
      publishedAt: new Date("2026-08-11T08:00:00.000Z"),
    }),
    updateContent: async (id, patch) => {
      updates.push({ id, patch });
      return { ...localContent(), ...patch };
    },
  };

  const service = new AiContentService(repo, "tenant-mondescale", {
    provider: { name: "test-provider" },
  });
  const result = await service.publishContent("content-1");

  assert.equal(result.status, "published");
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, "content-1");
  assert.equal(updates[0].patch.status, "published");
  assert.ok(updates[0].patch.publishedAt instanceof Date);
});

test("MSE-25.9 network editorial publication does not require a canonical agency site", async () => {
  let canonicalLookup = false;
  const repo = {
    createJob() {},
    getContent: async () => localContent({
      seo: {
        editorialTargeting: {
          scope: "network",
          agencyIds: [],
          indexAgencyId: null,
        },
      },
    }),
    getPublishedAgencySiteByAgencyId: async () => {
      canonicalLookup = true;
      return null;
    },
    updateContent: async (id, patch) => ({ id, ...patch }),
  };

  const service = new AiContentService(repo, "tenant-mondescale", {
    provider: { name: "test-provider" },
  });
  const result = await service.publishContent("content-1");

  assert.equal(result.status, "published");
  assert.equal(canonicalLookup, false);
});

test("MSE-25.9 canonical site repository lookup remains tenant scoped", async () => {
  let captured = null;
  const prisma = {
    agencySite: {
      findFirst: async (args) => {
        captured = args;
        return { id: "site-6", agencyId: 6, slug: "bois-colombes", status: "published", publishedAt: new Date() };
      },
    },
  };

  const repository = new AiContentRepository(prisma, "tenant-mondescale");
  await repository.getPublishedAgencySiteByAgencyId("6");

  assert.equal(captured.where.tenantId, "tenant-mondescale");
  assert.equal(captured.where.agencyId, 6);
  assert.deepEqual(captured.where.OR, [
    { status: "published" },
    { publishedAt: { not: null } },
  ]);
});

test("MSE-25.9 canonical publication guard fails closed when repository support is unavailable", async () => {
  await assert.rejects(
    () => assertEditorialCanonicalIsPublishable({}, localContent()),
    (error) => error?.code === "AI_CONTENT_CANONICAL_SITE_CHECK_UNAVAILABLE" && error?.statusCode === 503
  );
});
