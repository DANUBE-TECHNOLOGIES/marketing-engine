"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { SearchConsoleSubmissionService, MODE } = require("../src/modules/search-console-submission/service");

function fakePrisma() {
  return {
    seoAutopilotRun: {
      async findMany({ where, take }) {
        assert.equal(where.tenantId, "tenant-1");
        assert.equal(where.mode, MODE);
        assert.equal(take, 20);
        return [
          { id: "run-search-console", tenantId: "tenant-1", mode: MODE, status: "succeeded" },
        ];
      },
    },
  };
}

function structuredDataService() {
  return {
    publicOrigin: "https://agences.mondescale.com",
    async previewSitemap() {
      return {
        indexationReadiness: {
          sites: [
            {
              siteSlug: "gien",
              readyToSubmit: true,
              blockers: [],
              warnings: [],
            },
            {
              siteSlug: "maurepas",
              readyToSubmit: false,
              blockers: [{ code: "ORPHANED_URL" }],
              warnings: [],
            },
          ],
        },
      };
    },
  };
}

test("candidates exposes canonical sitemap URLs and readiness counts", async () => {
  const service = new SearchConsoleSubmissionService({
    prisma: fakePrisma(),
    structuredDataService: structuredDataService(),
  });

  const result = await service.candidates({ tenantId: "tenant-1" });
  assert.equal(result.count, 2);
  assert.equal(result.readyCount, 1);
  assert.equal(result.blockedCount, 1);
  assert.equal(result.sites[0].sitemapUrl, "https://agences.mondescale.com/agence/gien/sitemap.xml");
  assert.equal(result.sites[1].readyToSubmit, false);
});

test("submission history is scoped to Search Console mode", async () => {
  const service = new SearchConsoleSubmissionService({
    prisma: fakePrisma(),
    structuredDataService: structuredDataService(),
  });

  const result = await service.list({
    tenantId: "tenant-1",
    status: "succeeded",
    limit: 20,
  });

  assert.equal(result.count, 1);
  assert.equal(result.runs[0].mode, MODE);
});
