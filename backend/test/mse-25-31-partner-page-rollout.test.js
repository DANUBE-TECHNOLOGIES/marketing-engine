"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPartnerPageRolloutStatus,
  ensureNetworkPartnerPages,
  ensurePartnerPageOnly,
  partnerPageState,
} = require("../src/modules/agency-site/partner-page-rollout");
const SitemapBuilder = require("../src/modules/agency-site/builders/sitemap-builder");
const { isPublishedPage } = require("../src/modules/agency-site/builders/sitemap-builder");

function agencyPage(slug) {
  return { id: `agency-${slug}`, title: "Notre agence", slug: "agence", path: `/agence/${slug}/agence`, status: "published", published: true };
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
      pages: [
        agencyPage("nevers"),
        { id: "partners-nevers", title: "Nos partenaires", slug: "partenaires", path: "/agence/nevers/partenaires", status: "draft", published: false },
      ],
    },
    {
      id: "site-dax",
      name: "Mondescale Dax",
      slug: "dax",
      status: "published",
      agencyId: 3,
      agency: { name: "Mondescale Dax", city: "Dax" },
      pages: [
        agencyPage("dax"),
        { id: "partners-dax", title: "Nos partenaires", slug: "partenaires", path: "/agence/dax/partenaires", status: "published", published: true },
      ],
    },
  ];
  const calls = [];

  return {
    calls,
    async listSites() { return sites; },
    async ensurePartnerPage(agencyId, input) {
      calls.push({ agencyId, input });
      const site = sites.find((candidate) => Number(candidate.agencyId) === Number(agencyId));
      const existing = site.pages.find((page) => page.slug === "partenaires");
      if (existing) return { created: 0, skipped: 1, partnerPage: existing };
      const page = { id: `partners-${site.slug}`, title: "Nos partenaires", slug: "partenaires", path: `/agence/${site.slug}/partenaires`, status: "draft", published: false };
      site.pages.push(page);
      return { created: 1, skipped: 0, partnerPage: page };
    },
  };
}

test("partner page rollout distinguishes missing draft and published pages", async () => {
  const service = fakeService();
  const status = await buildPartnerPageRolloutStatus(service);
  assert.deepEqual(status.summary, {
    totalSites: 3,
    missing: 1,
    eligibleMissing: 1,
    blockedMissing: 0,
    published: 1,
    draftOrReview: 1,
  });
  assert.equal(status.sites.find((row) => row.siteSlug === "gien").partnerPageState, "missing");
  assert.equal(status.sites.find((row) => row.siteSlug === "gien").rolloutEligible, true);
  assert.equal(status.sites.find((row) => row.siteSlug === "nevers").partnerPageState, "draft");
  assert.equal(status.sites.find((row) => row.siteSlug === "dax").partnerPageState, "published");
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
    draftOrReview: 1,
  });
  assert.deepEqual(result.after, {
    totalSites: 3,
    missing: 0,
    eligibleMissing: 0,
    blockedMissing: 0,
    published: 1,
    draftOrReview: 2,
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
