"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { TenantScopedRepository } = require("../src/modules/tenant-core/scoped-repository");
const MarketingAutomationRepository = require("../src/modules/marketing-automation/repository");
const { SeoBrainRepository } = require("../src/modules/seo-brain/repository");

test("scope ajoute toujours le tenant courant", () => {
  const repo = new TenantScopedRepository({}, "tenant-a");
  assert.deepEqual(repo.scope({ status: "draft" }), { status: "draft", tenantId: "tenant-a" });
});

test("createData empêche de forcer un autre tenant", () => {
  const repo = new TenantScopedRepository({}, "tenant-a");
  assert.deepEqual(repo.createData({ name: "Campagne", tenantId: "tenant-b" }), { name: "Campagne", tenantId: "tenant-a" });
});

test("les campagnes sont filtrées par tenant", async () => {
  let query;
  const prisma = { marketingCampaign: { findMany: async (args) => { query = args; return []; } } };
  await new MarketingAutomationRepository(prisma, "tenant-a").listCampaigns({ status: "draft" });
  assert.equal(query.where.tenantId, "tenant-a");
  assert.equal(query.where.status, "draft");
});

test("le SEO Brain ne voit que les sites du tenant", async () => {
  let query;
  const prisma = { agencySite: { findMany: async (args) => { query = args; return []; } } };
  await new SeoBrainRepository(prisma, "tenant-b").listSites();
  assert.deepEqual(query.where, { tenantId: "tenant-b" });
});

test("le SEO Brain filtre aussi les destinations", async () => {
  let query;
  const prisma = { destination: { findMany: async (args) => { query = args; return []; } } };
  await new SeoBrainRepository(prisma, "tenant-c").listDestinations();
  assert.equal(query.where.tenantId, "tenant-c");
  assert.deepEqual(query.where.status.in, ["published", "active"]);
});
