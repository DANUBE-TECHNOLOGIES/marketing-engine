"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MiniSiteStructuredDataService,
} = require("../src/modules/minisite-structured-data/service");

function serviceWithSitemap(sitemap) {
  const service = new MiniSiteStructuredDataService({
    repository: {},
    publicOrigin: "https://example.test",
  });
  service.previewSitemap = async () => sitemap;
  return service;
}

test("returns XML only for a submission-ready minisite", async () => {
  const service = serviceWithSitemap({
    entries: [
      { siteSlug: "gien", pageSlug: "", url: "https://example.test/agence/gien" },
    ],
    indexationReadiness: {
      sites: [{ siteSlug: "gien", readyToSubmit: true, blockers: [], warnings: [] }],
    },
  });

  const result = await service.siteSitemapCandidate({ siteSlug: "gien", tenantId: "tenant-1" });
  assert.equal(result.readyToSubmit, true);
  assert.equal(result.entryCount, 1);
  assert.match(result.xml, /<loc>https:\/\/example\.test\/agence\/gien<\/loc>/);
});

test("keeps blocked minisite visible but withholds XML candidate", async () => {
  const service = serviceWithSitemap({
    entries: [
      { siteSlug: "nevers", pageSlug: "contact", url: "https://example.test/agence/nevers/contact" },
    ],
    indexationReadiness: {
      sites: [{ siteSlug: "nevers", readyToSubmit: false, blockers: ["missing-indexable-site-root"], warnings: [] }],
    },
  });

  const result = await service.siteSitemapCandidate({ siteSlug: "nevers", tenantId: "tenant-1" });
  assert.equal(result.readyToSubmit, false);
  assert.equal(result.xml, null);
  assert.deepEqual(result.readiness.blockers, ["missing-indexable-site-root"]);
});

test("unknown or unpublished minisite is not a submission candidate", async () => {
  const service = serviceWithSitemap({
    entries: [],
    indexationReadiness: { sites: [] },
  });

  await assert.rejects(
    () => service.siteSitemapCandidate({ siteSlug: "draft-site", tenantId: "tenant-1" }),
    (error) => error?.code === "MINISITE_INDEXATION_SITE_NOT_FOUND" && error?.status === 404
  );
});
