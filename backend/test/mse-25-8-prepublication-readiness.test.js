"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PrepublicationReadinessService,
  canonicalPageKey,
  contentCheck,
  legalCheck,
  seoCheck,
} = require("../src/modules/agency-launch/prepublication-readiness");

function page({
  id,
  slug,
  seoTitle = "Titre SEO",
  metaDescription = "Description SEO locale suffisamment renseignée.",
  status = "draft",
  published = false,
} = {}) {
  return {
    id: id || `page-${slug || "home"}`,
    slug,
    title: slug || "Accueil",
    seoTitle,
    metaDescription,
    status,
    published,
    displayOrder: 0,
  };
}

const draftLaunchPages = [
  page({ id: "home", slug: "" }),
  page({ id: "agency", slug: "agence" }),
  page({ id: "services", slug: "services" }),
  page({ id: "contact", slug: "contact" }),
  page({ id: "legal", slug: "mentions-legales", seoTitle: "", metaDescription: "" }),
  page({ id: "privacy", slug: "confidentialite", seoTitle: "", metaDescription: "" }),
];

test("MSE-25.8 treats empty, home and accueil slugs as the canonical home page", () => {
  assert.equal(canonicalPageKey(""), "home");
  assert.equal(canonicalPageKey("home"), "home");
  assert.equal(canonicalPageKey("accueil"), "home");
});

test("MSE-25.8 accepts existing draft launch pages before site publication", () => {
  const site = {
    pages: draftLaunchPages,
  };

  const content = contentCheck(site);
  const legal = legalCheck(site);
  const seo = seoCheck(site);

  assert.equal(content.passed, true);
  assert.equal(content.requiredPassed, 4);
  assert.equal(content.requiredPages[0].actualSlug, "");
  assert.equal(content.requiredPages.every((item) => item.published === false), true);

  assert.equal(legal.passed, true);
  assert.equal(legal.items.every((item) => item.published === false), true);

  assert.equal(seo.passed, true);
  assert.equal(seo.launchPages, 4);
  assert.deepEqual(seo.missingSeoTitle, []);
  assert.deepEqual(seo.missingDescription, []);
});

test("MSE-25.8 blocks publication when a required launch page lacks SEO", () => {
  const site = {
    pages: draftLaunchPages.map((item) => ({ ...item })),
  };

  const services = site.pages.find((item) => item.slug === "services");
  services.seoTitle = "";

  const seo = seoCheck(site);

  assert.equal(seo.passed, false);
  assert.deepEqual(seo.missingSeoTitle, [
    { id: "services", slug: "services" },
  ]);
});

test("MSE-25.8 prepublication readiness is tenant-scoped and reaches 100 before pages are published", async () => {
  let capturedQuery = null;

  const database = {
    agency: {
      async findFirst(query) {
        capturedQuery = query;
        return {
          id: 3,
          tenantId: "tenant_mondescale",
          name: "Ambassade FRAM - Mondescale Dax",
          city: "Dax",
          address: "1 rue du Voyage",
          postalCode: "40100",
          phone: "05 00 00 00 00",
          email: "dax@mondescale.com",
          agencySites: [
            {
              id: "site-dax",
              agencyId: 3,
              tenantId: "tenant_mondescale",
              name: "Dax",
              slug: "ambassade-fram-mondescale-dax",
              basePath: "/agence/ambassade-fram-mondescale-dax",
              status: "draft",
              publishedAt: null,
              updatedAt: new Date("2026-08-10T12:00:00Z"),
              pages: draftLaunchPages,
            },
          ],
        };
      },
    },
  };

  const service = new PrepublicationReadinessService({
    prisma: database,
    tenantId: "tenant_mondescale",
  });

  const report = await service.readiness(3);

  assert.deepEqual(capturedQuery.where, {
    id: 3,
    tenantId: "tenant_mondescale",
  });
  assert.deepEqual(
    capturedQuery.select.agencySites.where,
    { tenantId: "tenant_mondescale" }
  );

  assert.equal(report.mode, "prepublication");
  assert.equal(report.site.published, false);
  assert.equal(report.readiness.score, 100);
  assert.equal(report.readiness.ready, true);
  assert.deepEqual(report.readiness.blockers, []);
});
