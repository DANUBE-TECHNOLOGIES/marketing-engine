"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildPublicSitemap,
} = require("../src/modules/minisite-structured-data/sitemap");
const {
  MiniSiteStructuredDataRepository,
} = require("../src/modules/minisite-structured-data/repository");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 sitemap exposes each published destination on each published agency site", () => {
  const sitemap = buildPublicSitemap({
    publicOrigin: "https://agences.mondescale.com",
    sites: [
      { id: "site-3", agencyId: 3, slug: "dax", status: "published", pages: [] },
      { id: "site-6", agencyId: 6, slug: "bois-colombes", status: "published", pages: [] },
      { id: "site-9", agencyId: 9, slug: "draft", status: "draft", pages: [] },
    ],
    destinations: [
      {
        id: "destination-sicile",
        slug: "sicile",
        name: "Sicile",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
    ],
    inspirations: [],
  });

  const entries = sitemap.entries.filter((entry) => entry.type === "destination");
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => entry.url).sort(),
    [
      "https://agences.mondescale.com/agence/bois-colombes/destination/sicile",
      "https://agences.mondescale.com/agence/dax/destination/sicile",
    ]
  );
  assert.equal(sitemap.summary.destinations, 1);
  assert.equal(sitemap.summary.indexedDestinationPages, 2);
});

test("MSE-25.9 structured-data destination query remains tenant scoped", async () => {
  let captured = null;
  const prisma = {
    destination: {
      findMany: async (args) => {
        captured = args;
        return [];
      },
    },
  };

  const repository = new MiniSiteStructuredDataRepository(prisma);
  await repository.listPublishedDestinations("tenant-mondescale");

  assert.equal(captured.where.tenantId, "tenant-mondescale");
  assert.equal(captured.where.status, "published");
});

test("MSE-25.9 destination page uses localized metadata and full content renderer", () => {
  const page = source("frontend/app/agence/[siteSlug]/destination/[destinationSlug]/page.js");
  const renderer = source("frontend/components/destination/DestinationPage.js");

  assert.match(page, /localDestinationTitle/);
  assert.match(page, /site\?\.agency\?\.city/);
  assert.match(page, /robots:\s*\{[\s\S]*index:\s*true/);
  assert.match(renderer, /SectionContent/);
  assert.match(renderer, /FAQPage/);
  assert.match(renderer, /d\.sections/);
  assert.match(renderer, /d\.faqs/);
  assert.doesNotMatch(renderer, /<header/);
  assert.doesNotMatch(renderer, /<main/);
});

test("MSE-25.9 launch and site-publication routers have one namespaced server mount", () => {
  const server = source("backend/src/server.js");
  const modules = source("backend/src/modules/register-modules.js");

  assert.match(server, /["']\/api\/agency-launch["']/);
  assert.match(server, /["']\/api\/site-publication["']/);
  assert.doesNotMatch(modules, /createAgencyLaunchRouter/);
  assert.doesNotMatch(modules, /createSitePublicationRoutes/);
});
