"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { MiniSiteSemanticEngineService } = require("../src/modules/minisite-semantic-engine/service");

function fixtures() {
  const sites = [
    { id: "site-4", slug: "gien", status: "published", agencyId: 4, agency: { id: 4, city: "Gien" }, pages: [{ id: "p-home", slug: "home", title: "Accueil", published: true }] },
    { id: "site-9", slug: "amilly", status: "draft", agencyId: 9, agency: { id: 9, city: "Amilly" }, pages: [] },
  ];
  const repository = {
    listSites: async () => sites,
    findSiteByAgency: async (agencyId) => sites.find((site) => String(site.agencyId) === String(agencyId)) || null,
  };
  const enrichmentService = {
    buildAgencyContentOptimization: async ({ agencyId }) => ({
      pages: [{
        pageId: "p-home",
        slug: "home",
        title: "Agence de voyages à Gien",
        published: true,
        currentBlocks: [
          { id: "hero", blockType: "hero", content: { title: "Agence de voyages à Gien" } },
          { id: "copy", blockType: "rich_text", content: { html: "Conseil voyage à Gien" } },
        ],
        page: { id: "p-home", slug: "home", title: "Agence de voyages à Gien", seoTitle: "Agence de voyages à Gien", published: true, status: "published" },
      }],
      excludedPages: [],
      agencyId,
    }),
  };
  return { repository, enrichmentService };
}

test("service hydrates semantic analysis from persisted Website Designer blocks and exposes exact proposals", async () => {
  const { repository, enrichmentService } = fixtures();
  const service = new MiniSiteSemanticEngineService({ repository, enrichmentService });
  const result = await service.previewAgency({ agencyId: 4 });
  assert.equal(result.site.city, "Gien");
  assert.equal(result.pages[0].slug, "home");
  assert.equal(result.coverage.find((row) => row.intentKey === "agency").status, "strong");
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.ok(result.semanticProposals);
  assert.equal(result.semanticProposals.summary.automaticWriteCount, 0);
  assert.equal(result.summary.semanticProposalCount, result.semanticProposals.summary.proposalCount);
  assert.match(result.planFingerprint, /^[0-9a-f]{64}$/);
});

test("network service excludes drafts before expensive content hydration and aggregates semantic proposals", async () => {
  const { repository, enrichmentService } = fixtures();
  let calls = 0;
  const wrapped = { buildAgencyContentOptimization: async (options) => { calls += 1; return enrichmentService.buildAgencyContentOptimization(options); } };
  const service = new MiniSiteSemanticEngineService({ repository, enrichmentService: wrapped });
  const result = await service.previewNetwork();
  assert.equal(calls, 1);
  assert.equal(result.summary.agenciesProcessed, 1);
  assert.equal(result.summary.agenciesExcluded, 1);
  assert.equal(result.excludedSites[0].siteSlug, "amilly");
  assert.equal(result.summary.automaticWriteCount, 0);
  assert.equal(result.summary.semanticProposalCount, result.agencies[0].summary.semanticProposalCount);
});

test("agency preview fails closed for an unknown mini-site", async () => {
  const { repository, enrichmentService } = fixtures();
  const service = new MiniSiteSemanticEngineService({ repository, enrichmentService });
  await assert.rejects(() => service.previewAgency({ agencyId: 404 }), { code: "MSE_25_40_SITE_NOT_FOUND" });
});

test("service resolves tenantId before constructing persisted content reader", async () => {
  const { repository } = fixtures();
  const prisma = {
    agencySite: {
      findUnique: async ({ where, select }) => {
        assert.deepEqual(where, { id: "site-4" });
        assert.deepEqual(select, { tenantId: true });
        return { tenantId: "tenant_mondescale" };
      },
    },
  };
  const service = new MiniSiteSemanticEngineService({ prisma, repository });
  const tenantId = await service.resolveTenantId(await repository.findSiteByAgency(4));
  assert.equal(tenantId, "tenant_mondescale");
});

test("service fails closed when tenantId cannot be resolved", async () => {
  const { repository } = fixtures();
  const prisma = { agencySite: { findUnique: async () => null } };
  const service = new MiniSiteSemanticEngineService({ prisma, repository });
  await assert.rejects(
    () => service.contentServiceForSite({ id: "site-4" }),
    { code: "MSE_25_40_TENANT_ID_REQUIRED" }
  );
});
