"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTopicGraph } = require("../src/modules/minisite-semantic-engine/topic-graph");
const { planSemanticOpportunities } = require("../src/modules/minisite-semantic-engine/opportunity-planner");

function coverage() {
  return [
    { intentKey: "agency", label: "agence", commercial: true, priority: 100, status: "strong", bestPageSlug: "home", bestScore: 100, bestLocalityScore: 100 },
    { intentKey: "services", label: "services", commercial: true, priority: 92, status: "strong", bestPageSlug: "services", bestScore: 100, bestLocalityScore: 70 },
    { intentKey: "ticketing", label: "billetterie", commercial: true, priority: 90, status: "gap", bestPageSlug: "services", bestScore: 60, bestLocalityScore: 70 },
    { intentKey: "reviews", label: "avis", commercial: false, priority: 70, status: "strong", bestPageSlug: "avis", bestScore: 100, bestLocalityScore: 0 },
    { intentKey: "contact", label: "contact", commercial: false, priority: 58, status: "strong", bestPageSlug: "contact", bestScore: 100, bestLocalityScore: 0 },
  ];
}

test("topic graph connects canonical intent owners without self links", () => {
  const graph = buildTopicGraph({ coverage: coverage() });
  assert.ok(graph.edges.length > 0);
  assert.equal(graph.edges.some((edge) => edge.fromPageSlug === edge.toPageSlug), false);
  assert.ok(graph.edges.some((edge) => edge.fromPageSlug === "home" && edge.toPageSlug === "services"));
  assert.ok(graph.edges.some((edge) => edge.fromPageSlug === "home" && edge.toPageSlug === "avis"));
});

test("opportunity planner prioritizes strengthening an existing commercial page", () => {
  const graph = buildTopicGraph({ coverage: coverage() });
  const result = planSemanticOpportunities({ opportunities: [
    {
      type: "strengthen-existing-page",
      intentKey: "ticketing",
      label: "billetterie et vols",
      pageSlug: "services",
      priority: "high",
      currentScore: 40,
      currentLocalityScore: 60,
      targetScore: 70,
      targetLocalityScore: 50,
      reason: "intent-weak",
    },
    {
      type: "page-candidate-review",
      intentKey: "cruise",
      label: "croisières",
      pageSlug: null,
      priority: "medium",
      currentScore: 0,
      currentLocalityScore: 0,
      targetScore: 70,
      targetLocalityScore: 50,
      reason: "intent-absent",
    },
  ] }, graph);
  assert.equal(result.items[0].intentKey, "ticketing");
  assert.equal(result.items[0].safeForAutomaticProposal, true);
  assert.equal(result.items[0].safeForAutomaticWrite, false);
  const newPage = result.items.find((row) => row.intentKey === "cruise");
  assert.equal(newPage.executionClass, "new-page-evidence-gate");
  assert.equal(newPage.evidenceRequired, true);
  assert.deepEqual(newPage.operations, ["page-necessity-review", "search-demand-evidence-required", "manual-editorial-brief"]);
});
