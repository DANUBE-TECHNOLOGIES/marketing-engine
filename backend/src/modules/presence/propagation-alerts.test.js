"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildPropagationAlerts } = require("./propagation-alerts");

test("propagation alerts ignore normal rows and prioritize critical ones", () => {
  const rows = [
    { agencyId: 1, agencyName: "Gien", listingId: 10, propagation: { ageMs: 2 * 60 * 60 * 1000 } },
    { agencyId: 2, agencyName: "Nevers", listingId: 11, propagation: { ageMs: 30 * 60 * 60 * 1000 } },
    { agencyId: 3, agencyName: "Dax", listingId: 12, propagation: { ageMs: 80 * 60 * 60 * 1000 } }
  ];
  const result = buildPropagationAlerts(rows);
  assert.equal(result.total, 2);
  assert.equal(result.alerts[0].agencyId, 3);
  assert.equal(result.alerts[0].severity, "critical");
  assert.equal(result.alerts[1].severity, "stale");
});
