"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildConsolidatedExecutionPlan } = require("../src/modules/minisite-semantic-engine/consolidated-execution-plan");

function proposal(intentKey, pageSlug, valueScore = 99) {
  return {
    type: "existing-page-semantic-uplift",
    intentKey,
    pageSlug,
    valueScore,
    reason: "intent-weak",
    proposed: {
      seoTitle: `${intentKey} title`,
      h1: `${intentKey} h1`,
      metaDescription: `${intentKey} meta`,
      editorialBrief: {
        heading: `${intentKey} à Gien`,
        targetWords: 180,
        requiredThemes: ["expertise réelle"],
        forbiddenPatterns: ["keyword stuffing"],
      },
      internalLinks: [{ toPageSlug: "contact", toIntent: "contact", anchor: "contact" }],
    },
  };
}

function network() {
  return {
    planFingerprint: "a".repeat(64),
    agencies: [{
      site: { slug: "gien", agencyId: 4, city: "Gien" },
      pages: [
        { pageId: "home-id", slug: "home", primaryIntent: "agency", primaryIntentScore: 100, localityScore: 100 },
        { pageId: "services-id", slug: "services", primaryIntent: "services", primaryIntentScore: 100, localityScore: 70 },
      ],
      coverage: [
        { intentKey: "agency", status: "strong", bestPageSlug: "home" },
        { intentKey: "services", status: "strong", bestPageSlug: "services" },
      ],
      semanticProposals: {
        proposals: [
          proposal("cruise", "home"),
          proposal("circuit", "home"),
          proposal("tailor-made", "home"),
          proposal("stay", "home", 96),
          proposal("ticketing", "services"),
        ],
      },
    }],
  };
}

test("consolidation turns multiple intent proposals into one page action", () => {
  const result = buildConsolidatedExecutionPlan(network());
  assert.equal(result.summary.pageActionCount, 2);
  assert.equal(result.summary.secondaryIntentCount, 5);
  assert.equal(result.summary.titleCollisionCount, 0);
  assert.equal(result.summary.h1CollisionCount, 0);
  assert.equal(result.summary.automaticWriteCount, 0);

  const home = result.sites[0].pages.find((row) => row.pageSlug === "home");
  assert.equal(home.metadata.strategy, "preserve-existing-primary-identity");
  assert.equal(home.metadata.rewriteTitle, false);
  assert.equal(home.metadata.rewriteH1, false);
  assert.deepEqual(home.secondaryIntentSections.map((row) => row.intentKey), ["circuit", "cruise", "tailor-made", "stay"]);
  assert.ok(home.secondaryIntentSections.every((row) => row.headingLevel === "h2"));
});

test("services preserves its strong primary identity while adding ticketing as secondary intent", () => {
  const result = buildConsolidatedExecutionPlan(network());
  const services = result.sites[0].pages.find((row) => row.pageSlug === "services");
  assert.equal(services.primaryIntent, "services");
  assert.equal(services.metadata.rewriteTitle, false);
  assert.equal(services.secondaryIntentSections.length, 1);
  assert.equal(services.secondaryIntentSections[0].intentKey, "ticketing");
});

test("execution plan is deterministic and read-only", () => {
  const first = buildConsolidatedExecutionPlan(network());
  const second = buildConsolidatedExecutionPlan(network());
  assert.equal(first.executionFingerprint, second.executionFingerprint);
  assert.equal(first.readOnly, true);
  assert.equal(first.writes, false);
  assert.equal(first.destructive, false);
  assert.equal(first.policy.oneTitlePerPage, true);
  assert.equal(first.policy.oneH1PerPage, true);
});
