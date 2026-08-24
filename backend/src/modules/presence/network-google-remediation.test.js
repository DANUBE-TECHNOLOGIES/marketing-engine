"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildGoogleRemediationRunPlan } = require("./network-google-remediation");

const agencies = [{ id: 1, name: "Gien", city: "Gien" }, { id: 2, name: "Nevers", city: "Nevers" }];
const directories = [{ id: 10, name: "Google Business Profile", active: true, impactScore: 5, priority: 5, difficulty: 1 }];
const listings = [
  { id: 100, agencyId: 1, directoryId: 10, status: "pending", nameCorrect: true, addressCorrect: true, phoneCorrect: false, websiteCorrect: false, categoryCorrect: true, hoursCorrect: true },
  { id: 101, agencyId: 2, directoryId: 10, status: "pending", nameCorrect: false, addressCorrect: true, phoneCorrect: true, websiteCorrect: true, categoryCorrect: true, hoursCorrect: true }
];

test("standard Google drift is planned while sensitive drift is skipped by default", () => {
  const plan = buildGoogleRemediationRunPlan(agencies, directories, listings, { limit: 10 });
  assert.equal(plan.totalGoogleAnomalies, 2);
  assert.equal(plan.planned, 1);
  assert.equal(plan.skippedSensitive, 1);
  assert.equal(plan.items[0].agencyId, 1);
  assert.equal(plan.items[0].risk, "standard");
});

test("sensitive Google drift can only enter an explicitly sensitive plan", () => {
  const plan = buildGoogleRemediationRunPlan(agencies, directories, listings, { limit: 10, includeSensitive: true });
  assert.equal(plan.planned, 2);
  assert.ok(plan.items.some((item) => item.risk === "high"));
});
