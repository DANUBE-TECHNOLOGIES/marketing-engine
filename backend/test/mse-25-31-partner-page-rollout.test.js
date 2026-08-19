"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPartnerPageRolloutStatus,
  ensureNetworkPartnerPages,
  ensurePartnerPageOnly,
  partnerPageReadiness,
  partnerPageState,
} = require("../src/modules/agency-site/partner-page-rollout");
const SitemapBuilder = require("../src/modules/agency-site/builders/sitemap-builder");
const { isPublishedPage } = require("../src/modules/agency-site/builders/sitemap-builder");

function agencyPage(slug) {
  return { id: `agency-${slug}`, title: "Notre agence", slug: "agence", path: `/agence/${slug}/agence`, status: "published", published: true };
}

function partnerSummary(slug, status = "draft", published = false) {
  return { id: `partners-${slug}`, title: "Nos partenaires", slug: "partenaires", path: `/agence/${slug}/partenaires`, status, published };
}

function partnerDetails(slug, status = "draft", published = false) {
  const city = slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    ...partnerSummary(slug, status, published),
    h1: `Nos partenaires de voyage à ${city}`,
    seoTitle: `Partenaires voyage à ${city} | Mondescale ${city}`,
    metaDescription: `Découvrez les tour-opérateurs, croisiéristes et spécialistes sélectionnés par Mondescale ${city} pour construire et comparer les solutions adaptées à votre prochain voyage.`,
    sections: [
      { sectionType: "page-header", jsonContent: { title: `Nos partenaires de voyage à ${city}`, __builderType: "page-header" } },
      { sectionType: "partners-introduction", jsonContent: { title: "Des partenaires sélectionnés", __builderType: "partners-introduction" } },
      { sectionType: "partner-directory", jsonContent: { title: "Tous nos partenaires voyage", __builderType: "partner-directory" } },
      { sectionType: "contact-cta", jsonContent: { title: "Parlons de votre voyage", __builderType: "contact-cta" } },
    ],
    blocks: [],
  };
}

function fakeService({ gienAgencyPage = true } = {}) {
  const sites = [
    {
      id: "site-gien",
      name: "Mondescale Gien",
      slug: "gien",
      status: "published",
      agencyId: 1,
      agency: { name: "Mondescale Gien", city: "Gien" },
      pages: gienAgencyPage ? [agencyPage("gien")] : [],
    },
    {
      id: "site-nevers",
      name: "Mondescale Nevers",
      slug: "nevers",
      status: "published",
      agencyId: 2,
      agency: { name: "Mondescale Nevers", city: "Nevers" },
      pages: [agencyPage("nevers"), partnerSummary("nevers", "draft", false)],
    },
    {
      id: "site-dax",
      name: "Mondescale Dax",
      slug: "dax",
      status: "published",
      agencyId: 3,
      agency: { name: "Mondescale Dax", city: "Dax" },
      pages: [agencyPage("dax"), partnerSummary("dax", "published", true)],
    },
  ];
  const calls = [];

  return {
    calls,
    async listSites() { return sites; },
    async page(agencyId, slug) {
      const site = sites.find((candidate) => Number(candidate.agencyId) === Number(agencyId));
      const summary = site?.pages.find((page) => page.slug === slug);
      if (!summary) {
        const error = new Error("Page introuvable");
        error.statusCode = 404;
        throw error;
      }
      return partnerDetails(site.slug, summary.status, summary.published);
    },
    async ensurePartnerPage(agencyId, input) {
      calls.push({ agencyId, input });
      const site = sites.find((candidate) => Number(candidate.agencyId) === Number(agencyId));
      const existing = site.pages.find((page) => page.slug === "partenaires");
      if (existing) return { created: 0, skipped: 1, partnerPage: existing };
      const page = partnerSummary(site.slug, "draft", false);
      site.pages.push(page);
      return { created: 1, skipped: 0, partnerPage: page };
    },
  };
}

test("partner page readiness requires structure, H1 and SEO metadata", () => {
  const ready = partnerPageReadiness(partnerDetails("gien", "draft", false));
  assert.equal(ready.ready, true);
  assert.equal(ready.blockingCount, 0);
  assert.deepEqual(ready.missingSections, []);

  const incomplete = partnerPageReadiness({
    ...partnerDetails("gien", "published", true),
    h1: "",
    metaDescription: "",
    sections: [
      { sectionType: "page-header", jsonContent: { __builderType: "page-header" } },
      { sectionType: "partner-directory", jsonContent: { __builderType: "partner-directory" } },
      { sectionType: "partner-directory--2", jsonContent: { __builderType: "partner-directory" } },
    ],
  });
  assert.equal(incomplete.ready, false);
  assert.ok(incomplete.missingSections.includes("partners-introduction"));
  assert.ok(incomplete.missingSections.includes("contact-cta"));
  assert.equal(incomplete.duplicateSections[0].type, "partner-directory");
  assert.ok(incomplete.issues.some((issue) => issue.code === "PARTNER_PAGE_H1_MISSING"));
  assert.ok(incomplete.issues.some((issue) => issue.code === "PARTNER_PAGE_META_DESCRIPTION_MISSING"));
});

test("partner page rollout distinguishes missing draft and published pages", async () => {
  const service = fakeService();
  const status = await buildPartnerPageRolloutStatus(service);
  assert.deepEqual(status.summary, {
    totalSites: 3,
    missing: 1,
    eligibleMissing: 1,
    blockedMissing: 0,
    published: 1,
    publishedReady: 1,
    publishedNotReady: 0,
    draftOrReview: 1,
    draftOrReviewReady: 1,
  });
  assert.equal(status.sites.find((row) => row.siteSlug === "gien").partnerPageState, "missing");
  assert.equal(status.sites.find((row) => row.siteSlug === "gien").rolloutEligible, true);
  assert.equal(status.sites.find((row) => row.siteSlug === "nevers").partnerPageState, "draft");
  assert.equal(status.sites.find((row) => row.siteSlug === "nevers").partnerPageReady, true);
  assert.equal(status.sites.find((row) => row.siteSlug === "dax").partnerPageState, "published");
  assert.equal(status.sites.find((row) => row.siteSlug === "dax").partnerPageReady, true);
  assert.equal(partnerPageState({ status: "review", published: false }), "review");
});

test("network rollout requires confirmation and creates only missing partner pages", async () => {
  const service = fakeService();
  await assert.rejects(
    () => ensureNetworkPartnerPages(service, {}),
    (error) => error?.code === "PARTNER_PAGE_NETWORK_CONFIRMATION_REQUIRED"
  );
  const result = await ensureNetworkPartnerPages(service, { confirmed: true });
  assert.equal(service.calls.length, 1);
  assert.deepEqual(service.calls[0], { agencyId: 1, input: { confirmed: true } });
  assert.equal(result.createdSiteCount, 1);
  assert.equal(result.blockedSiteCount, 0);
  assert.deepEqual(result.before, {
    totalSites: 3,
    missing: 1,
    eligibleMissing: 1,
    blockedMissing: 0,
    published: 1,
    publishedReady: 1,
    publishedNotReady: 0,
    draftOrReview: 1,
    draftOrReviewReady: 1,
  });
  assert.deepEqual(result.after, {
    totalSites: 3,
    missing: 0,
    eligibleMissing: 0,
    blockedMissing: 0,
    published: 1,
    publishedReady: 1,
    publishedNotReady: 0,
    draftOrReview: 2,
    draftOrReviewReady: 2,
  });
  assert.equal(result.results[0].partnerPage.status, "draft");
  assert.equal(result.results[0].partnerPage.published, false);
});

test("partner rollout never creates the parent agency page as a side effect", async () => {
  const service = fakeService({ gienAgencyPage: false });
  const status = await buildPartnerPageRolloutStatus(service);
  const gien = status.sites.find((row) => row.siteSlug === "gien");
  assert.equal(gien.partnerPageState, "missing");
  assert.equal(gien.agencyPagePresent, false);
  assert.equal(gien.rolloutEligible, false);
  assert.equal(gien.rolloutBlockReason, "AGENCY_PAGE_MISSING");
  assert.equal(status.summary.blockedMissing, 1);

  const networkResult = await ensureNetworkPartnerPages(service, { confirmed: true });
  assert.equal(networkResult.createdSiteCount, 0);
  assert.equal(networkResult.blockedSiteCount, 1);
  assert.equal(service.calls.length, 0);
  assert.deepEqual(networkResult.blocked[0], {
    agencyId: 1,
    siteId: "site-gien",
    siteSlug: "gien",
    reason: "AGENCY_PAGE_MISSING",
  });

  await assert.rejects(
    () => ensurePartnerPageOnly(service, 1, { confirmed: true }),
    (error) => error?.code === "PARTNER_PAGE_ROLLOUT_AGENCY_PAGE_REQUIRED" && error?.statusCode === 409
  );
  assert.equal(service.calls.length, 0);
});

test("draft partner page stays out of sitemap until publication", () => {
  const builder = new SitemapBuilder();
  const site = { basePath: "/agence/gien" };
  const pages = [
    { path: "/agence/gien", pageType: "HOME", status: "published", published: true },
    { path: "/agence/gien/partenaires", pageType: "PARTNERS", status: "draft", published: false },
    { path: "/agence/gien/services", pageType: "SERVICES", status: "published", published: false },
  ];
  const xml = builder.build(site, pages, "https://agences.mondescale.com");
  assert.match(xml, /https:\/\/agences\.mondescale\.com\/agence\/gien<\/loc>/);
  assert.match(xml, /https:\/\/agences\.mondescale\.com\/agence\/gien\/services<\/loc>/);
  assert.doesNotMatch(xml, /\/agence\/gien\/partenaires<\/loc>/);
  assert.equal(isPublishedPage(pages[1]), false);
  assert.equal(isPublishedPage(pages[2]), true);

  const publishedPartnerPage = { ...pages[1], status: "published", published: true };
  const publishedXml = builder.build(site, [publishedPartnerPage], "https://agences.mondescale.com");
  assert.match(publishedXml, /\/agence\/gien\/partenaires<\/loc>/);
});
