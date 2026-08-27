"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildPropagationDashboard } = require("./propagation-dashboard");

test("dashboard ranks stale propagation first and links escalation", () => {
  const pending = [
    { agencyId: 1, agencyName: "Gien", city: "Gien", listingId: 10, submittedAt: new Date(), propagation: { state: "normal", ageMs: 1000 } },
    { agencyId: 2, agencyName: "Dax", city: "Dax", listingId: 11, submittedAt: new Date(), propagation: { state: "stale", ageMs: 100000 } }
  ];
  const actions = [{ id: 77, agencyId: 2 }];
  const dashboard = buildPropagationDashboard(pending, actions);
  assert.equal(dashboard.summary.pending, 2);
  assert.equal(dashboard.summary.stale, 1);
  assert.equal(dashboard.summary.openEscalations, 1);
  assert.equal(dashboard.rows[0].agencyId, 2);
  assert.equal(dashboard.rows[0].escalationOpen, true);
  assert.equal(dashboard.rows[0].actionId, 77);
});
