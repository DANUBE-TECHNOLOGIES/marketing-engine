"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const AiContentRepository = require("../src/modules/ai-content/repository");

test("MSE-25.9 published inspiration detail is tenant-scoped and publication-scoped", async () => {
  let query = null;

  const prisma = {
    seoContent: {
      findFirst: async (input) => {
        query = input;
        return {
          id: "content-1",
          tenantId: "tenant-a",
          slug: "sicile-hors-saison",
          status: "published",
          publishedAt: new Date("2026-08-10T10:00:00Z"),
          revision: 2,
        };
      },
    },
  };

  const repository = new AiContentRepository(prisma, "tenant-a");
  const content = await repository.getPublishedContentBySlug("sicile-hors-saison");

  assert.equal(content.id, "content-1");
  assert.deepEqual(query.where, {
    tenantId: "tenant-a",
    slug: "sicile-hors-saison",
    status: "published",
    publishedAt: { not: null },
  });
  assert.deepEqual(query.orderBy, [
    { revision: "desc" },
    { publishedAt: "desc" },
  ]);
});

test("MSE-25.9 published inspiration detail rejects an empty slug before querying Prisma", async () => {
  let touched = false;

  const prisma = {
    seoContent: {
      findFirst: async () => {
        touched = true;
        return null;
      },
    },
  };

  const repository = new AiContentRepository(prisma, "tenant-a");
  const content = await repository.getPublishedContentBySlug("   ");

  assert.equal(content, null);
  assert.equal(touched, false);
});
