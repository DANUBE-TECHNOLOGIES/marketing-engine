"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildPropagationControlPlan } = require("./propagation-control");

const rows = [
  { agencyId: 1, agencyName: "Gien", listingId: 10, listingUrl: "https://example.test/gien", propagation: { state: "normal", ageMs: 1000 } },
  { agencyId: 2, agencyName: "Nevers", listingId: 11, listingUrl: "https://example.test/nevers", propagation: { state: "slow", ageMs: 8 * 60 * 60 * 1000 } },
  { agencyId: 3, agencyName: "Dax", listingId: 12, listingUrl: "https://example.test/dax", propagation: { state: "stale", ageMs: 30 * 60 * 60 * 1000 } }
];

test("control plan verifies slow and stale but never normal by default", () => {
  const plan = buildPropagationControlPlan(rows, { maxVerifications: 10 });
  assert.equal(plan.totalPending, 3);
  assert.equal(plan.plannedVerifications, 2);
  assert.equal(plan.escalations, 1);
  assert.deepEqual(plan.verificationQueue.map((item) => item.agencyId), [2, 3]);
  assert.equal(plan.escalationQueue[0].agencyId, 3);
});

test("control plan respects verification budget", () => {
  const plan = buildPropagationControlPlan(rows, { maxVerifications: 1 });
  assert.equal(plan.plannedVerifications, 1);
  assert.equal(plan.escalations, 1);
});
