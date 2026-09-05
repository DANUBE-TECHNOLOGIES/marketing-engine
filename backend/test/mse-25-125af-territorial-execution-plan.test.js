"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  executionScore,
  buildTerritorialExecutionPlan,
} = require("../src/modules/ranking-grid/territorial-execution-plan");
const { buildTerritorialActionPlan } = require("../src/modules/ranking-grid/territorial-action-plan");

function bucket(p1, p2, averageRank) {
  return { cells: p1 + p2, p1, p2, p3: 0, monitor: 0, averageRank };
}

function cells(city, ranks, priority) {
  return ranks.map((rank, index) => ({
    row: index,
    col: index,
    rank,
    priority,
    latitude: 48.9 + (index / 100),
    longitude: 2.27 + (index / 100),
    territory: { city },
  }));
}

test("execution score favors high-impact low-effort actions within the same territory", () => {
  const territory = { urgency: "critical", score: 20 };
  const service = executionScore(territory, { code: "service_area_relevance" });
  const review = executionScore(territory, { code: "review_signal" });
  assert.ok(service > review);
});

test("wave 1 takes two strongest actions for every critical territory", () => {
  const plan = buildTerritorialActionPlan({
    campaignId: 11,
    agencyId: 6,
    city: "Bois-Colombes",
    byCity: {
      "Levallois-Perret": bucket(2, 0, 61),
      "Asnières-sur-Seine": bucket(1, 1, 25.5),
      Clichy: bucket(1, 0, 45),
      "Neuilly-sur-Seine": bucket(1, 0, 34),
      Colombes: bucket(0, 3, 15.67),
      Courbevoie: bucket(0, 2, 22.5),
      Gennevilliers: bucket(0, 2, 18.5),
      "La Garenne-Colombes": bucket(0, 1, 18),
    },
    cells: [
      ...cells("Levallois-Perret", [59, 63], "p1"),
      ...cells("Asnières-sur-Seine", [31, 20], "p1"),
      ...cells("Clichy", [45], "p1"),
      ...cells("Neuilly-sur-Seine", [34], "p1"),
      ...cells("Colombes", [17, 15, 15], "p2"),
      ...cells("Courbevoie", [22, 23], "p2"),
      ...cells("Gennevilliers", [20, 17], "p2"),
      ...cells("La Garenne-Colombes", [18], "p2"),
    ],
  });

  assert.equal(plan.executionPlan.summary.wave1, 8);
  assert.equal(plan.executionPlan.summary.wave2, 8);
  assert.equal(plan.executionPlan.providerCalls, 0);
  assert.equal(plan.executionPlan.externalCalls, 0);
  assert.equal(plan.executionPlan.databaseWrites, 0);

  const criticalCities = new Set([
    "Levallois-Perret",
    "Asnières-sur-Seine",
    "Clichy",
    "Neuilly-sur-Seine",
  ]);
  assert.deepEqual(new Set(plan.executionPlan.wave1.map((row) => row.city)), criticalCities);
  for (const city of criticalCities) {
    assert.equal(plan.executionPlan.wave1.filter((row) => row.city === city).length, 2);
  }

  const codesByCity = new Map();
  for (const row of plan.executionPlan.wave1) {
    if (!codesByCity.has(row.city)) codesByCity.set(row.city, new Set());
    codesByCity.get(row.city).add(row.actionCode);
  }
  for (const codes of codesByCity.values()) {
    assert.ok(codes.has("service_area_relevance"));
    assert.ok(codes.has("internal_linking"));
  }
});

test("wave 2 seeds every high-priority territory before backlog", () => {
  const plan = {
    territories: [
      { city: "Critical", urgency: "critical", score: 20, actions: [
        { code: "service_area_relevance", type: "onsite", action: "A" },
        { code: "internal_linking", type: "onsite", action: "B" },
        { code: "local_proof", type: "content", action: "C" },
      ] },
      { city: "High A", urgency: "high", score: 10, actions: [
        { code: "service_area_relevance", type: "onsite", action: "D" },
      ] },
      { city: "High B", urgency: "high", score: 9, actions: [
        { code: "service_area_relevance", type: "onsite", action: "E" },
      ] },
    ],
  };
  const execution = buildTerritorialExecutionPlan(plan);
  assert.ok(execution.wave2.some((row) => row.city === "High A"));
  assert.ok(execution.wave2.some((row) => row.city === "High B"));
});
