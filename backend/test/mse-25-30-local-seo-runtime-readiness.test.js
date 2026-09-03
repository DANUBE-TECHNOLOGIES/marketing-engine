"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { attachLocalSeoReadiness } = require("../src/modules/minisite-structured-data/local-seo-readiness");

function sitemapSite() {
  return {
    indexationReadiness: {
      sites: [{
        siteSlug: "mondescale-gien",
        readyToSubmit: true,
        blockers: [],
        warnings: [],
      }],
    },
    summary: {},
  };
}

test("MSE-25.30 autorise le runtime avec score 58 si aucun gap high ou critical ne subsiste", () => {
  const result = attachLocalSeoReadiness(sitemapSite(), {
    summary: { averageScore: 58 },
    sites: [{
      siteSlug: "mondescale-gien",
      score: 58,
      status: "weak",
      gaps: [
        { code: "secondary-intent-quality", severity: "medium" },
        { code: "meta-improvement", severity: "medium" },
      ],
    }],
  });

  const site = result.indexationReadiness.sites[0];
  assert.equal(site.readyToSubmit, true);
  assert.deepEqual(site.blockers, []);
  assert.equal(site.localSeo.ready, true);
  assert.equal(site.localSeo.score, 58);
  assert.equal(site.localSeo.scoreTargetMet, false);
  assert.equal(site.localSeo.blockingGapCount, 0);
  assert.equal(result.indexationReadiness.readyToSubmit, true);
});

test("MSE-25.30 continue de bloquer le runtime lorsqu un gap high subsiste", () => {
  const result = attachLocalSeoReadiness(sitemapSite(), {
    summary: { averageScore: 90 },
    sites: [{
      siteSlug: "mondescale-gien",
      score: 90,
      status: "strong",
      gaps: [{ code: "homepage-title-locality-missing", severity: "high" }],
    }],
  });

  const site = result.indexationReadiness.sites[0];
  assert.equal(site.readyToSubmit, false);
  assert.ok(site.blockers.includes("local-seo-not-ready"));
  assert.equal(site.localSeo.ready, false);
  assert.equal(site.localSeo.scoreTargetMet, true);
  assert.equal(site.localSeo.blockingGapCount, 1);
});
