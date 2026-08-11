"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { actionPlan } = require("./seo-health-action-plan");

test("orders weaknesses by lost points and links matching actions", () => {
  const report = {
    seoHealth: { components: [
      { code: "visibility", label: "Visibilité locale", weight: 30, points: 12, detail: "Faible Top 10" },
      { code: "citations", label: "Citations", weight: 15, points: 10, detail: "Quelques écarts" },
    ]},
    seoActions: { actions: [
      { source: "LOCAL_RANKINGS", code: "RANKING_NEAR_TOP10", title: "Renforcer la page services" },
      { source: "LOCAL_CITATIONS", code: "CITATION_INCONSISTENCY", title: "Corriger PagesJaunes" },
    ]},
  };
  const plan = actionPlan(report);
  assert.equal(plan.steps[0].component, "visibility");
  assert.equal(plan.steps[0].lostPoints, 18);
  assert.equal(plan.steps[0].action.title, "Renforcer la page services");
  assert.equal(plan.steps[1].action.title, "Corriger PagesJaunes");
});

test("weakness without available recommendation is monitoring only", () => {
  const plan = actionPlan({
    seoHealth: { components: [{ code: "trend", label: "Tendance", weight: 10, points: 5, detail: "Historique insuffisant" }] },
    seoActions: { actions: [] },
  });
  assert.equal(plan.steps[0].status, "monitor");
  assert.equal(plan.actionableSteps, 0);
});
