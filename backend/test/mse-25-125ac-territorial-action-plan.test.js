"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  urgencyFor,
  weightedPriority,
  buildTerritorialActionPlan,
} = require("../src/modules/ranking-grid/territorial-action-plan");

test("territorial urgency follows P1/P2/P3 bands", () => {
  assert.equal(urgencyFor({ p1: 1 }), "critical");
  assert.equal(urgencyFor({ p2: 1 }), "high");
  assert.equal(urgencyFor({ p3: 1 }), "medium");
  assert.equal(urgencyFor({}), "monitor");
});

test("weighted priority keeps critical territories ahead of P2-only territories", () => {
  assert.ok(
    weightedPriority({ p1: 1, p2: 0, averageRank: 31 }) >
      weightedPriority({ p1: 0, p2: 2, averageRank: 22.5 })
  );
});

test("Bois-Colombes action plan prioritizes Levallois and preserves doorway guard", () => {
  const byCity = {
    "Levallois-Perret": { cells: 2, p1: 2, p2: 0, p3: 0, monitor: 0, averageRank: 61 },
    Clichy: { cells: 1, p1: 1, p2: 0, p3: 0, monitor: 0, averageRank: 45 },
    "Neuilly-sur-Seine": { cells: 1, p1: 1, p2: 0, p3: 0, monitor: 0, averageRank: 34 },
    "Asnières-sur-Seine": { cells: 2, p1: 1, p2: 1, p3: 0, monitor: 0, averageRank: 25.5 },
    Courbevoie: { cells: 2, p1: 0, p2: 2, p3: 0, monitor: 0, averageRank: 22.5 },
    Gennevilliers: { cells: 2, p1: 0, p2: 2, p3: 0, monitor: 0, averageRank: 18.5 },
    Colombes: { cells: 3, p1: 0, p2: 3, p3: 0, monitor: 0, averageRank: 15.67 },
    "La Garenne-Colombes": { cells: 1, p1: 0, p2: 1, p3: 0, monitor: 0, averageRank: 18 },
  };
  const cells = [
    { rank: 59, priority: "p1", territory: { city: "Levallois-Perret" } },
    { rank: 63, priority: "p1", territory: { city: "Levallois-Perret" } },
    { rank: 45, priority: "p1", territory: { city: "Clichy" } },
    { rank: 34, priority: "p1", territory: { city: "Neuilly-sur-Seine" } },
    { rank: 31, priority: "p1", territory: { city: "Asnières-sur-Seine" } },
    { rank: 20, priority: "p2", territory: { city: "Asnières-sur-Seine" } },
  ];

  const plan = buildTerritorialActionPlan({
    campaignId: 11,
    agencyId: 6,
    city: "Bois-Colombes",
    byCity,
    cells,
  });

  assert.equal(plan.mode, "read_only");
  assert.equal(plan.databaseWrites, 0);
  assert.equal(plan.providerCalls, 0);
  assert.equal(plan.executionTriggered, false);
  assert.equal(plan.summary.territories, 8);
  assert.equal(plan.summary.critical, 4);
  assert.equal(plan.summary.high, 4);
  assert.equal(plan.summary.topPriorityCity, "Levallois-Perret");
  assert.equal(plan.territories[0].worstRank, 63);
  assert.match(plan.doorwayGuard, /fake locations|fake location/i);
  assert.ok(plan.territories[0].actions.some((action) => action.code === "service_area_relevance"));
  assert.ok(plan.territories[0].actions.some((action) => /doorway/i.test(action.guardrail)));
});
