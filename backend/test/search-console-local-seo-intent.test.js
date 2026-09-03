"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreLocalIntent } = require("../src/modules/search-console-submission/local-seo-intent");
const { prioritizeSearchOpportunities } = require("../src/modules/search-console-submission/opportunity-prioritization");

const context = { primaryCity: "Gien", targetCities: ["Briare", "Sully-sur-Loire"], agencyName: "Mondescale Voyages Gien", postalCode: "45500" };

test("MSE-25.23 strongly scores explicit local commercial intent", () => {
  const result = scoreLocalIntent("agence de voyage Gien", context);
  assert.equal(result.level, "strong");
  assert.ok(result.score >= 70);
  assert.ok(result.matches.some((match) => match.type === "primary-city"));
  assert.ok(result.matches.some((match) => match.type === "local-commercial-intent"));
});

test("MSE-25.23 recognizes secondary target cities without confusing generic queries", () => {
  assert.equal(scoreLocalIntent("voyage Briare", context).level, "medium");
  assert.equal(scoreLocalIntent("circuit sicile tout compris", context).level, "weak");
});

test("MSE-25.23 ranks a stronger local query ahead when baseline SEO potential is comparable", () => {
  const rows = [
    { dimensions: { query: "voyage sicile" }, impressions: 120, clicks: 2, ctr: 0.01, position: 8 },
    { dimensions: { query: "agence de voyage Gien" }, impressions: 100, clicks: 2, ctr: 0.01, position: 8 },
  ];
  const opportunities = prioritizeSearchOpportunities(rows, { localContext: context });
  assert.equal(opportunities[0].query, "agence de voyage Gien");
  assert.ok(opportunities[0].localPriorityScore > opportunities[1].localPriorityScore);
  assert.equal(opportunities[0].localIntent.level, "strong");
});
