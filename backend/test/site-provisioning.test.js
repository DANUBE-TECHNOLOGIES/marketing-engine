"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { SiteProvisioningService, normalizeIds } = require("../src/modules/site-provisioning/service");
const { pageBlocks } = require("../src/modules/site-provisioning/templates");

function makeRepo(overrides = {}) {
  const agencies = [
    { id: 1, name: "Agence A", city: "Paris", agencySites: [] },
    { id: 2, name: "Agence B", city: "Lyon", agencySites: [{ id: "s2", slug: "agence-b", status: "draft" }] },
  ];
  return {
    listAgencies: async ids => ids ? agencies.filter(a => ids.includes(a.id)) : agencies,
    getAgency: async id => agencies.find(a => a.id === Number(id)) || null,
    getSiteByAgencyId: async id => id === 2 ? { id: "s2", slug: "agence-b", basePath: "/agence/agence-b", pages: [] } : null,
    findBlock: async () => null,
    createBlock: async (pageId, block) => ({ id: "b", pageId, ...block }),
    ...overrides,
  };
}

test("health expose la capacité d'auto-provisionnement", () => {
  const service = new SiteProvisioningService(makeRepo(), "t1", {});
  assert.equal(service.health().version, "14.2.0");
});

test("status compte les agences équipées et manquantes", async () => {
  const service = new SiteProvisioningService(makeRepo(), "t1", {});
  const result = await service.status();
  assert.equal(result.totalAgencies, 2);
  assert.equal(result.provisioned, 1);
  assert.equal(result.missing, 1);
});

test("le dry-run sélectionne seulement les agences sans site", async () => {
  const service = new SiteProvisioningService(makeRepo(), "t1", {});
  const result = await service.provisionBatch({ dryRun: true });
  assert.equal(result.selected, 1);
  assert.equal(result.agencies[0].agencyId, 1);
});

test("provisionne une agence puis amorce ses blocs", async () => {
  let generated = false;
  const site = { id: "s1", slug: "agence-a", basePath: "/agence/agence-a", pages: [{ id: "p1", slug: "", pageType: "HOME" }] };
  const repo = makeRepo({ getSiteByAgencyId: async id => generated && id === 1 ? site : null });
  const siteService = { generate: async id => { assert.equal(id, 1); generated = true; } };
  const service = new SiteProvisioningService(repo, "t1", siteService);
  const result = await service.provisionAgency(1);
  assert.equal(result.alreadyProvisioned, false);
  assert.equal(result.pageCount, 1);
  assert.equal(result.blocks.created, 2);
});

test("le provisionnement est idempotent pour les blocs", async () => {
  const site = { id: "s2", slug: "agence-b", basePath: "/agence/agence-b", pages: [{ id: "p2", slug: "avis", pageType: "CONTENT" }] };
  const repo = makeRepo({
    getSiteByAgencyId: async () => site,
    findBlock: async () => ({ id: "existing" }),
  });
  const service = new SiteProvisioningService(repo, "t1", {});
  const result = await service.provisionAgency(2);
  assert.equal(result.alreadyProvisioned, true);
  assert.equal(result.blocks.created, 0);
  assert.equal(result.blocks.skipped, 1);
});

test("les modèles créent hero et CTA sur l'accueil", () => {
  const blocks = pageBlocks({ slug: "", pageType: "HOME", siteBasePath: "/agence/test" }, { name: "Agence Test", city: "Gien" });
  assert.deepEqual(blocks.map(x => x.blockType), ["hero", "cta"]);
  assert.equal(blocks[0].status, "draft");
});

test("normalizeIds refuse les identifiants invalides", () => {
  assert.throws(() => normalizeIds([1, "x"]), /invalide/);
});
