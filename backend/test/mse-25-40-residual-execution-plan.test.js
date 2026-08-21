"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildResidualExecutionPlan } = require("../src/modules/minisite-semantic-engine/residual-execution-plan");

function section(intentKey) {
  return {
    intentKey,
    headingLevel: "h2",
    heading: `${intentKey} à Gien`,
    targetWords: 140,
    internalLinks: [],
  };
}

function fixture() {
  const networkPlan = {
    planFingerprint: "a".repeat(64),
    agencies: [{
      site: { slug: "gien", agencyId: 4, city: "Gien" },
      coverage: [
        { intentKey: "agency", status: "strong", bestPageSlug: "agence", candidatePages: [] },
        { intentKey: "services", status: "strong", bestPageSlug: "services", candidatePages: [] },
        { intentKey: "ticketing", status: "gap", bestPageSlug: "services", candidatePages: [{ slug: "services", score: 24, localityScore: 70, managedRoute: false }] },
        { intentKey: "cruise", status: "gap", bestPageSlug: "home", candidatePages: [{ slug: "home", score: 24, localityScore: 100, managedRoute: false }] },
        { intentKey: "circuit", status: "strong", bestPageSlug: "circuits", candidatePages: [{ slug: "circuits", score: 100, localityScore: 70, managedRoute: true }] },
      ],
    }],
  };

  const consolidatedPlan = {
    version: "mse-25.40",
    operation: "consolidated-semantic-execution-preview",
    sourcePlanFingerprint: networkPlan.planFingerprint,
    executionFingerprint: "b".repeat(64),
    sites: [{
      siteSlug: "gien",
      agencyId: 4,
      city: "Gien",
      pages: [
        {
          pageSlug: "home",
          pageId: "home-id",
          pagePlanFingerprint: "c".repeat(64),
          primaryIntent: "agency",
          metadata: {
            strategy: "strengthen-primary-identity-only",
            rewriteTitle: true,
            rewriteH1: true,
            rewriteMetaDescription: true,
          },
          secondaryIntentSections: [section("cruise"), section("circuit")],
        },
        {
          pageSlug: "services",
          pageId: "services-id",
          pagePlanFingerprint: "d".repeat(64),
          primaryIntent: "services",
          metadata: {
            strategy: "preserve-existing-primary-identity",
            rewriteTitle: false,
            rewriteH1: false,
            rewriteMetaDescription: false,
          },
          secondaryIntentSections: [section("ticketing")],
        },
      ],
    }],
  };

  return { networkPlan, consolidatedPlan };
}

test("whole-architecture coverage suppresses unnecessary home metadata rewrite", () => {
  const { networkPlan, consolidatedPlan } = fixture();
  const result = buildResidualExecutionPlan(networkPlan, consolidatedPlan);
  const home = result.sites[0].pages.find((page) => page.pageSlug === "home");
  assert.equal(home.metadata.eligible, false);
  assert.equal(home.metadata.reason, "primary-intent-covered-elsewhere");
  assert.equal(home.metadata.coveredByPageSlug, "agence");
});

test("home is never filled with secondary intents merely to improve semantic scores", () => {
  const { networkPlan, consolidatedPlan } = fixture();
  const result = buildResidualExecutionPlan(networkPlan, consolidatedPlan);
  const home = result.sites[0].pages.find((page) => page.pageSlug === "home");
  assert.equal(home.executable, false);
  assert.equal(home.eligibleSections.length, 0);
  assert.equal(home.suppressedSections.length, 2);
  assert.equal(result.summary.homeSecondarySectionWriteCount, 0);
  assert.ok(home.suppressedSections.some((row) => row.intentKey === "cruise" && row.suppressionReason === "home-secondary-fill-prohibited"));
  assert.ok(home.suppressedSections.some((row) => row.intentKey === "circuit" && row.suppressionReason === "intent-covered-elsewhere"));
});

test("a real unresolved commercial deficit on an existing non-home page remains executable", () => {
  const { networkPlan, consolidatedPlan } = fixture();
  const result = buildResidualExecutionPlan(networkPlan, consolidatedPlan);
  const services = result.sites[0].pages.find((page) => page.pageSlug === "services");
  assert.equal(services.executable, true);
  assert.deepEqual(services.eligibleSections.map((row) => row.intentKey), ["ticketing"]);
  assert.equal(result.summary.executablePageCount, 1);
  assert.equal(result.summary.eligibleSectionCount, 1);
  assert.equal(result.summary.automaticWriteCount, 0);
});

test("covered intent on the target page is closed instead of appending another residual section", () => {
  const { networkPlan, consolidatedPlan } = fixture();
  const ticketing = networkPlan.agencies[0].coverage.find((row) => row.intentKey === "ticketing");
  ticketing.status = "covered";
  ticketing.bestScore = 48;
  ticketing.bestPageSlug = "services";

  const result = buildResidualExecutionPlan(networkPlan, consolidatedPlan);
  const services = result.sites[0].pages.find((page) => page.pageSlug === "services");
  assert.equal(services.executable, false);
  assert.equal(services.eligibleSections.length, 0);
  assert.equal(services.suppressedSections.length, 1);
  assert.equal(services.suppressedSections[0].suppressionReason, "intent-covered-on-target-page");
  assert.equal(services.suppressedSections[0].coverageStatus, "covered");
  assert.equal(result.summary.executablePageCount, 0);
  assert.equal(result.summary.eligibleSectionCount, 0);
});

test("residual plan is deterministic and chained to both source fingerprints", () => {
  const { networkPlan, consolidatedPlan } = fixture();
  const first = buildResidualExecutionPlan(networkPlan, consolidatedPlan);
  const second = buildResidualExecutionPlan(networkPlan, consolidatedPlan);
  assert.equal(first.residualExecutionFingerprint, second.residualExecutionFingerprint);
  assert.equal(first.sourcePlanFingerprint, networkPlan.planFingerprint);
  assert.equal(first.consolidatedExecutionFingerprint, consolidatedPlan.executionFingerprint);
  assert.equal(first.policy.noHomeScoreFilling, true);
  assert.equal(first.readOnly, true);
  assert.equal(first.writes, false);
});
