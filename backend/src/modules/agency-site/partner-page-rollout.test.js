"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPartnerPageRolloutStatus,
  ensureNetworkPartnerPages,
  partnerPageState,
} = require("./partner-page-rollout");

function fakeService() {
  const sites = [
    {
      id: "site-gien",
      name: "Mondescale Gien",
      slug: "gien",
      status: "published",
      agencyId: 1,
      agency: { name: "Mondescale Gien", city: "Gien" },
      pages: [],
    },
    {
      id: "site-nevers",
      name: "Mondescale Nevers",
      slug: "nevers",
      status: "published",
      agencyId: 2,
      agency: { name: "Mondescale Nevers", city: "Nevers" },
      pages: [{ id: "partners-nevers", title: "Nos partenaires", slug: "partenaires", path: "/agence/nevers/partenaires", status: "draft", published: false }],
    },
    {
      id: "site-dax",
      name: "Mondescale Dax",
      slug: "dax",
      status: "published",
      agencyId: 3,
      agency: { name: "Mondescale Dax", city: "Dax" },
      pages: [{ id: "partners-dax", title: "Nos partenaires", slug: "partenaires", path: "/agence/dax/partenaires", status: "published", published: true }],
    },
  ];
  const calls = [];

  return {
    calls,
    async listSites() { return sites; },
    async ensurePartnerPage(agencyId, input) {
      calls.push({ agencyId, input });
      const site = sites.find((candidate) => Number(candidate.agencyId) === Number(agencyId));
      const page = { id: `partners-${site.slug}`, title: "Nos partenaires", slug: "partenaires", path: `/agence/${site.slug}/partenaires`, status: "draft", published: false };
      site.pages.push(page);
      return { created: 1, skipped: 1, partnerPage: page };
    },
  };
}

test("partner page rollout status distinguishes missing draft and published pages", async () => {
  const service = fakeService();
  const status = await buildPartnerPageRolloutStatus(service);

  assert.deepEqual(status.summary, { totalSites: 3, missing: 1, published: 1, draftOrReview: 1 });
  assert.equal(status.sites.find((row) => row.siteSlug === "gien").partnerPageState, "missing");
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
  assert.deepEqual(result.before, { totalSites: 3, missing: 1, published: 1, draftOrReview: 1 });
  assert.deepEqual(result.after, { totalSites: 3, missing: 0, published: 1, draftOrReview: 2 });
  assert.equal(result.results[0].partnerPage.status, "draft");
  assert.equal(result.results[0].partnerPage.published, false);
});
