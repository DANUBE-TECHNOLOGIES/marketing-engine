"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildNetworkDiscoveryPlan } = require("./network-discovery");

const agencies = [
  { id: 1, name: "Mondescale Gien", address: "1 rue A", postalCode: "45500", city: "Gien", phone: "02 38 00 00 00" },
  { id: 2, name: "Mondescale Nevers", address: "2 rue B", postalCode: "58000", city: "Nevers", phone: "03 86 00 00 00" }
];

test("network discovery plans several agencies without exceeding task budget", () => {
  const plan = buildNetworkDiscoveryPlan(agencies, { maxTasks: 5, providerKeys: ["pagesjaunes", "mappy"] });
  assert.equal(plan.agencyCount, 2);
  assert.equal(plan.providerCount, 2);
  assert.equal(plan.budget.plannedTasks, 5);
  assert.ok(plan.budget.skippedByBudget > 0);
  assert.ok(plan.jobs.every((job) => ["pagesjaunes", "mappy"].includes(job.providerKey)));
});

test("network discovery can target one provider deterministically", () => {
  const plan = buildNetworkDiscoveryPlan(agencies, { maxTasks: 20, providerKeys: ["pagesjaunes"] });
  assert.equal(plan.providerCount, 1);
  assert.equal(plan.jobCount, 2);
  assert.equal(plan.jobs.every((job) => job.providerKey === "pagesjaunes"), true);
  assert.equal(plan.budget.plannedTasks, 6);
});
