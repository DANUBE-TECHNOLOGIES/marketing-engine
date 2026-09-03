"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { runSiteGenerationPipeline } = require("../src/lib/generationPipeline");

function fakePrisma() {
  const site = { id: "s1", slug: "ozoir", name: "Mondescale Ozoir", basePath: "/agence/ozoir", agency: { name: "Mondescale Ozoir" } };
  const destination = { id: "d1", name: "Budapest", slug: "budapest", country: "Hongrie", status: "published", summary: "Danube", highlights: [], themes: [], travelTypes: [], sections: [], faqs: [], relationsFrom: [] };
  return {
    agencySite: { findUnique: async ({ where }) => where.slug === "ozoir" ? site : null },
    destination: { findMany: async () => [destination] },
    agencySitePage: { findMany: async () => [] },
  };
}

test("exécute le pipeline en prévisualisation", async () => {
  const result = await runSiteGenerationPipeline({ prisma: fakePrisma(), siteSlug: "ozoir", dryRun: true, publish: false, baseUrl: "https://example.com" });
  assert.equal(result.ok, true);
  assert.equal(result.job.status, "success");
  assert.ok(result.plan.pages >= 4);
  assert.ok(result.job.steps.some((step) => step.name === "build-sitemap"));
});

test("retourne un job en échec pour un site absent", async () => {
  const result = await runSiteGenerationPipeline({ prisma: fakePrisma(), siteSlug: "absent", dryRun: true });
  assert.equal(result.ok, false);
  assert.equal(result.job.status, "failed");
});
