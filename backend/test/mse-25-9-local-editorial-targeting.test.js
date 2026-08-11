"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  normalizeEditorialTargeting,
  contentTargetsAgency,
  contentIndexesForAgency,
} = require("../src/modules/ai-content/editorial-targeting");
const {
  buildPublicSitemap,
} = require("../src/modules/minisite-structured-data/sitemap");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 normalizes network and agency editorial targeting", () => {
  assert.deepEqual(normalizeEditorialTargeting({ scope: "network", agencyIds: ["3"] }), {
    scope: "network",
    agencyIds: [],
    indexAgencyId: null,
  });

  assert.deepEqual(normalizeEditorialTargeting({ scope: "agencies", agencyIds: [3, "6", "3"] }), {
    scope: "agencies",
    agencyIds: ["3", "6"],
    indexAgencyId: "3",
  });

  assert.deepEqual(normalizeEditorialTargeting({
    scope: "agencies",
    agencyIds: ["3", "6"],
    indexAgencyId: "6",
  }), {
    scope: "agencies",
    agencyIds: ["3", "6"],
    indexAgencyId: "6",
  });

  assert.throws(
    () => normalizeEditorialTargeting({ scope: "agencies", agencyIds: [] }),
    (error) => error?.code === "AI_CONTENT_TARGET_AGENCY_REQUIRED"
  );

  assert.throws(
    () => normalizeEditorialTargeting({ scope: "agencies", agencyIds: ["3"], indexAgencyId: "6" }),
    (error) => error?.code === "AI_CONTENT_INDEX_AGENCY_INVALID"
  );
});

test("MSE-25.9 keeps visibility separate from canonical indexing", () => {
  const local = {
    seo: {
      editorialTargeting: {
        scope: "agencies",
        agencyIds: ["3", "6"],
        indexAgencyId: "6",
      },
    },
  };

  assert.equal(contentTargetsAgency({ seo: {} }, 9), true);
  assert.equal(contentTargetsAgency(local, 3), true);
  assert.equal(contentTargetsAgency(local, 6), true);
  assert.equal(contentTargetsAgency(local, 9), false);
  assert.equal(contentIndexesForAgency(local, 3), false);
  assert.equal(contentIndexesForAgency(local, 6), true);
  assert.equal(contentIndexesForAgency({ seo: {} }, 9), false);
});

test("MSE-25.9 sitemap indexes one local inspiration only on its canonical agency", () => {
  const sitemap = buildPublicSitemap({
    publicOrigin: "https://agences.mondescale.com",
    sites: [
      { id: "dax", agencyId: 3, slug: "dax", status: "published", pages: [] },
      { id: "bois", agencyId: 6, slug: "bois-colombes", status: "published", pages: [] },
    ],
    inspirations: [
      {
        id: "article-local",
        slug: "sicile-hors-saison",
        publishedAt: "2026-08-11T08:00:00.000Z",
        seo: {
          editorialTargeting: {
            scope: "agencies",
            agencyIds: ["3", "6"],
            indexAgencyId: "6",
          },
        },
      },
      {
        id: "article-network",
        slug: "voyager-autrement",
        publishedAt: "2026-08-11T08:00:00.000Z",
        seo: {
          editorialTargeting: {
            scope: "network",
            agencyIds: [],
            indexAgencyId: null,
          },
        },
      },
    ],
  });

  const inspirationEntries = sitemap.entries.filter((entry) => entry.type === "inspiration");
  assert.equal(inspirationEntries.length, 1);
  assert.equal(
    inspirationEntries[0].url,
    "https://agences.mondescale.com/agence/bois-colombes/inspiration/sicile-hors-saison"
  );
  assert.equal(sitemap.summary.indexedEditorialContents, 1);
  assert.equal(
    sitemap.excluded.some((entry) => entry.contentId === "article-network" && entry.reason === "no-canonical-agency"),
    true
  );
});

test("MSE-25.9 public routes and clients propagate tenant and agency scope", () => {
  const aiRoutes = source("backend/src/modules/ai-content/routes.js");
  const publicRoutes = source("backend/src/modules/public-site-read/routes.js");
  const proxyList = source("frontend/app/api/website-builder/inspirations/route.js");
  const proxyDetail = source("frontend/app/api/website-builder/inspirations/[contentSlug]/route.js");
  const client = source("frontend/lib/public-site-api.js");
  const detailPage = source("frontend/app/agence/[siteSlug]/inspiration/[contentSlug]/page.js");
  const studio = source("frontend/app/editorial-content/page.js");

  assert.match(aiRoutes, /agencyId/);
  assert.match(publicRoutes, /filterAgencyInspirations/);
  assert.match(publicRoutes, /tenantId:\s*String\(tenantId\)/);
  assert.match(publicRoutes, /editorialTargeting:\s*"tenant-and-agency-aware"/);
  assert.match(proxyList, /"agencyId"/);
  assert.match(proxyDetail, /searchParams\.set\("agencyId"/);
  assert.match(client, /getInspiration\(siteSlug, contentSlug\)/);
  assert.match(client, /site\?\.agencyId \|\| site\?\.agency\?\.id/);
  assert.match(detailPage, /isIndexOwner/);
  assert.match(detailPage, /index:\s*indexOwner/);
  assert.match(studio, /name="targetScope"/);
  assert.match(studio, /name="agencyIds"/);
  assert.match(studio, /name="indexAgencyId"/);
  assert.match(studio, /"x-tenant-slug": TENANT_SLUG/);
});
