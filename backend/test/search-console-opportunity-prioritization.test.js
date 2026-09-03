"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  prioritizeSearchOpportunities,
  recommendedAction,
} = require("../src/modules/search-console-submission/opportunity-prioritization");

test("prioritization filters weak rows and ranks quick wins deterministically", () => {
  const opportunities = prioritizeSearchOpportunities([
    { dimensions: { query: "voyage gien" }, clicks: 3, impressions: 240, ctr: 0.012, position: 7 },
    { dimensions: { query: "agence voyage gien" }, clicks: 4, impressions: 120, ctr: 0.04, position: 12 },
    { dimensions: { query: "requete faible" }, clicks: 0, impressions: 10, ctr: 0, position: 8 },
    { dimensions: { query: "deja top 3" }, clicks: 20, impressions: 300, ctr: 0.12, position: 2.5 },
  ]);

  assert.equal(opportunities.length, 2);
  assert.equal(opportunities[0].query, "voyage gien");
  assert.equal(opportunities[0].score, 100);
  assert.equal(opportunities[0].priority, "high");
  assert.equal(opportunities[0].action.code, "snippet");

  assert.equal(opportunities[1].query, "agence voyage gien");
  assert.equal(opportunities[1].priority, "medium");
  assert.equal(opportunities[1].action.code, "content-and-links");
});

test("recommendations distinguish snippet optimization from content reinforcement", () => {
  assert.equal(recommendedAction({ position: 6, ctr: 0.01 }).code, "snippet");
  assert.equal(recommendedAction({ position: 14, ctr: 0.02 }).code, "content-and-links");
  assert.equal(recommendedAction({ position: 8, ctr: 0.08 }).code, "consolidate");
});

test("prioritization never invents an opportunity without a query", () => {
  const opportunities = prioritizeSearchOpportunities([
    { dimensions: {}, impressions: 500, ctr: 0.01, position: 6 },
    { dimensions: { page: "https://example.test/page" }, impressions: 500, ctr: 0.01, position: 6 },
  ]);
  assert.deepEqual(opportunities, []);
});
