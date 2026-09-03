"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  attachIndexationReadiness,
  siteIndexationReadiness,
} = require("../src/modules/minisite-structured-data/indexation-readiness");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

test("MSE-25.82 technical readiness blocks a site without a canonical indexable root", () => {
  const sitemap = {
    entries: [
      {
        siteSlug: "site-a",
        pageSlug: "contact",
        url: "https://agences.mondescale.com/agence/site-a/contact",
      },
    ],
    excluded: [],
    crawlability: { orphanEntries: [] },
  };

  const readiness = siteIndexationReadiness(sitemap, "site-a");
  assert.equal(readiness.readyToSubmit, false);
  assert.equal(readiness.rootPresent, false);
  assert.deepEqual(readiness.blockers, ["missing-indexable-site-root"]);
});

test("MSE-25.82 orphaned public URLs are hard blockers while quality warnings remain non-destructive", () => {
  const sitemap = {
    entries: [
      {
        siteSlug: "site-a",
        pageSlug: "",
        url: "https://agences.mondescale.com/agence/site-a",
      },
      {
        siteSlug: "site-a",
        type: "destination",
        pageSlug: "destination/sicile",
        url: "https://agences.mondescale.com/agence/site-a/destination/sicile",
      },
    ],
    excluded: [
      {
        siteSlug: "site-a",
        type: "page",
        pageSlug: "page-mince",
        reason: "critically-thin-content",
      },
    ],
    crawlability: {
      orphanEntries: [
        {
          siteSlug: "site-a",
          url: "https://agences.mondescale.com/agence/site-a/destination/sicile",
        },
      ],
    },
  };

  const readiness = siteIndexationReadiness(sitemap, "site-a");
  assert.equal(readiness.readyToSubmit, false);
  assert.deepEqual(readiness.blockers, ["orphaned-indexable-entries"]);
  assert.equal(readiness.warnings.includes("critically-thin-pages-excluded"), true);
});

test("MSE-25.82 network readiness is derived from every published site and never from Search Console traffic presence", () => {
  const sitemap = {
    entries: [
      { siteSlug: "site-a", pageSlug: "", url: "https://agences.mondescale.com/agence/site-a" },
      { siteSlug: "site-b", pageSlug: "", url: "https://agences.mondescale.com/agence/site-b" },
    ],
    excluded: [],
    crawlability: { orphanEntries: [] },
    summary: { entryCount: 2 },
  };

  const result = attachIndexationReadiness(sitemap);
  assert.equal(result.indexationReadiness.siteCount, 2);
  assert.equal(result.indexationReadiness.readySites, 2);
  assert.equal(result.indexationReadiness.blockedSites, 0);
  assert.equal(result.indexationReadiness.readyToSubmit, true);
  assert.equal(result.summary.indexationReadyToSubmit, true);
  assert.equal(Object.hasOwn(result.indexationReadiness, "searchDataAvailable"), false);
});

test("MSE-25.82 Search Console health contract keeps explicit approval and automatic submission disabled", () => {
  const source = read("src/modules/search-console-submission/routes.js");

  assert.match(source, /explicitApprovalRequired\s*:\s*true/);
  assert.match(source, /autoSubmit\s*:\s*false/);
  assert.match(source, /readOnlySitemapObservability\s*:\s*true/);
  assert.match(source, /readOnlySearchPerformance\s*:\s*true/);
  assert.match(source, /readOnlyIndexationCoverage\s*:\s*true/);
  assert.match(source, /readOnlyPublicHttpIndexability\s*:\s*true/);
  assert.match(source, /readOnlyRuntimeReadiness\s*:\s*true/);
});

test("MSE-25.82 Google mutation routes remain POST-only and cannot be confused with observability GET routes", () => {
  const source = read("src/modules/search-console-submission/routes.js");

  assert.match(source, /router\.get\("\/search-console-submissions\/health"/);
  assert.match(source, /router\.get\("\/search-console-submissions\/properties"/);
  assert.match(source, /router\.get\("\/search-console-submissions\/public-indexability"/);
  assert.match(source, /router\.get\("\/search-console-submissions\/runtime-readiness"/);
  assert.match(source, /router\.post\("\/search-console-submissions\/preflight"/);
  assert.match(source, /router\.post\("\/search-console-submissions\/prepare"/);
  assert.match(source, /router\.post\("\/search-console-submissions\/:runId\/approve"/);
  assert.match(source, /router\.post\("\/search-console-submissions\/:runId\/submit"/);

  assert.doesNotMatch(source, /router\.get\("\/search-console-submissions\/:runId\/(?:approve|submit)"/);
});

test("MSE-25.82 public HTTP observability explicitly declares that it performs no Google or CMS write", () => {
  const source = read("src/modules/search-console-submission/routes.js");

  assert.match(
    source,
    /invariants\s*:\s*\{\s*readOnlyHttp\s*:\s*true\s*,\s*googleSubmission\s*:\s*false\s*,\s*pageCreation\s*:\s*false\s*,\s*publicationMutation\s*:\s*false\s*,\s*websiteDesignerMutation\s*:\s*false\s*\}/
  );
});
