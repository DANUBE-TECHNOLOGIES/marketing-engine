"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { networkSeoGoals } = require("./network-seo-goals");

test("network goals aggregate current and target Top 10 coverage", () => {
  const result = networkSeoGoals([
    { agency: { id: 1, city: "Gien" }, seoGoals: { primary: { current: 2, target: 4, remaining: 2, progress: 50 }, keywords: [{ currentPosition: 12, remainingPositions: 2 }] } },
    { agency: { id: 2, city: "Nevers" }, seoGoals: { primary: { current: 3, target: 4, remaining: 1, progress: 75 }, keywords: [{ currentPosition: 14, remainingPositions: 4 }] } },
  ]);
  assert.equal(result.currentTop10, 5);
  assert.equal(result.targetTop10, 8);
  assert.equal(result.remainingTop10, 3);
  assert.equal(result.progress, 62.5);
  assert.equal(result.opportunityKeywords, 2);
});

test("agencies with stronger Top 10 potential are ranked first", () => {
  const result = networkSeoGoals([
    { agency: { id: 1, city: "Gien" }, seoGoals: { primary: { current: 1, target: 3, remaining: 2 }, keywords: [{ currentPosition: 11, remainingPositions: 1 }, { currentPosition: 12, remainingPositions: 2 }] } },
    { agency: { id: 2, city: "Dax" }, seoGoals: { primary: { current: 4, target: 5, remaining: 1 }, keywords: [{ currentPosition: 18, remainingPositions: 8 }] } },
  ]);
  assert.equal(result.priorityAgencies[0].agency.city, "Gien");
});

test("empty network remains neutral", () => {
  const result = networkSeoGoals([]);
  assert.equal(result.agenciesObserved, 0);
  assert.equal(result.targetTop10, 0);
  assert.equal(result.progress, 0);
});
