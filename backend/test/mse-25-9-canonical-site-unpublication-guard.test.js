"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  publishedCanonicalEditorialDependencies,
  assertSiteHasNoPublishedCanonicalEditorialDependencies,
} = require("../src/modules/site-publication/editorial-dependency-guard");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function localEditorial(id, indexAgencyId) {
  return {
    id,
    slug: `article-${id}`,
    title: `Article ${id}`,
    publishedAt: new Date("2026-08-11T08:00:00.000Z"),
    seo: {
      editorialTargeting: {
        scope: "agencies",
        agencyIds: ["3", "6"],
        indexAgencyId: String(indexAgencyId),
      },
    },
  };
}

test("MSE-25.9 finds only published editorials canonically owned by the agency", async () => {
  let captured = null;
  const prisma = {
    seoContent: {
      findMany: async (args) => {
        captured = args;
        return [
          localEditorial("owned", 6),
          localEditorial("other", 3),
          {
            id: "network",
            slug: "network",
            title: "Network",
            publishedAt: new Date("2026-08-11T08:00:00.000Z"),
            seo: {
              editorialTargeting: {
                scope: "network",
                agencyIds: [],
                indexAgencyId: null,
              },
            },
          },
        ];
      },
    },
  };

  const dependencies = await publishedCanonicalEditorialDependencies(
    prisma,
    "tenant-mondescale",
    6
  );

  assert.equal(captured.where.tenantId, "tenant-mondescale");
  assert.equal(captured.where.status, "published");
  assert.deepEqual(captured.where.publishedAt, { not: null });
  assert.equal(dependencies.length, 1);
  assert.equal(dependencies[0].id, "owned");
});

test("MSE-25.9 blocks site unpublication before mutation when canonical editorials depend on it", async () => {
  const prisma = {
    seoContent: {
      findMany: async () => [localEditorial("owned", 6)],
    },
  };

  await assert.rejects(
    () => assertSiteHasNoPublishedCanonicalEditorialDependencies(prisma, {
      id: "site-bois",
      slug: "bois-colombes",
      tenantId: "tenant-mondescale",
      agencyId: 6,
    }),
    (error) =>
      error?.code === "SITE_CANONICAL_EDITORIAL_DEPENDENCIES" &&
      error?.statusCode === 409 &&
      error?.details?.dependencyCount === 1 &&
      error?.details?.dependencies?.[0]?.id === "owned"
  );
});

test("MSE-25.9 allows site unpublication when no published canonical editorial depends on it", async () => {
  const prisma = {
    seoContent: {
      findMany: async () => [localEditorial("other", 3)],
    },
  };

  await assert.doesNotReject(
    () => assertSiteHasNoPublishedCanonicalEditorialDependencies(prisma, {
      id: "site-bois",
      slug: "bois-colombes",
      tenantId: "tenant-mondescale",
      agencyId: 6,
    })
  );
});

test("MSE-25.9 site unpublish route checks editorial dependencies before invoking the orchestrator", () => {
  const routes = source("backend/src/modules/site-publication/routes.js");
  const guardPosition = routes.indexOf("assertSiteHasNoPublishedCanonicalEditorialDependencies(");
  const unpublishPosition = routes.indexOf("await service.unpublish({");

  assert.match(routes, /SITE_CANONICAL_EDITORIAL_DEPENDENCIES|assertSiteHasNoPublishedCanonicalEditorialDependencies/);
  assert.ok(guardPosition >= 0);
  assert.ok(unpublishPosition >= 0);
  assert.ok(guardPosition < unpublishPosition);
  assert.match(routes, /const site = await assertSiteInTenant/);
});
