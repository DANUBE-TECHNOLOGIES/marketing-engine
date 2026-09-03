"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  LEARNING_BONUS_CAP,
  learningBonus,
  scoreBreakdown,
  opportunityScore,
  networkSeoPriorities,
} = require("./network-seo-priorities");

test("ranking and citation actions outrank lower impact content tasks at equal priority", () => {
  assert.ok(
    opportunityScore({ priority: "high", source: "LOCAL_RANKINGS" }) >
      opportunityScore({ priority: "high", source: "LOCAL_CONTENT" })
  );
  assert.ok(
    opportunityScore({ priority: "high", source: "LOCAL_CITATIONS" }) >
      opportunityScore({ priority: "medium", source: "LOCAL_RANKINGS" })
  );
});

test("learning never influences priorities with insufficient samples", () => {
  const action = { source: "LOCAL_RANKINGS", code: "RANKING_NEAR_TOP10" };
  const learning = {
    groups: [{
      source: "LOCAL_RANKINGS",
      code: "RANKING_NEAR_TOP10",
      samples: 4,
      confidence: "low",
      improvementRate: 1,
      averageDelta: 9,
    }],
  };
  assert.equal(learningBonus(action, learning), 0);
});

test("credible positive learning adds only a bounded bonus", () => {
  const action = { source: "LOCAL_RANKINGS", code: "RANKING_NEAR_TOP10" };
  const learning = {
    groups: [{
      source: "LOCAL_RANKINGS",
      code: "RANKING_NEAR_TOP10",
      samples: 8,
      confidence: "medium",
      improvementRate: 0.875,
      averageDelta: 6.5,
    }],
  };
  const bonus = learningBonus(action, learning);
  assert.ok(bonus > 0);
  assert.ok(bonus <= LEARNING_BONUS_CAP);
});

test("score breakdown exposes base rules and learning separately", () => {
  const action = {
    priority: "high",
    source: "LOCAL_RANKINGS",
    code: "RANKING_NEAR_TOP10",
  };
  const learning = {
    groups: [{
      source: "LOCAL_RANKINGS",
      code: "RANKING_NEAR_TOP10",
      samples: 7,
      confidence: "medium",
      improvementRate: 0.75,
      averageDelta: 5,
    }],
  };
  const scoring = scoreBreakdown(action, learning);
  assert.equal(scoring.priorityScore, 70);
  assert.equal(scoring.sourceScore, 20);
  assert.equal(scoring.baseScore, 90);
  assert.ok(scoring.learningBonus > 0);
  assert.equal(scoring.finalScore, scoring.baseScore + scoring.learningBonus);
  assert.equal(scoring.learning.samples, 7);
  assert.equal(scoring.learning.confidence, "medium");
  assert.equal(scoring.learning.applied, true);
});

test("network queue merges agency actions and keeps agency identity", () => {
  const result = networkSeoPriorities([
    {
      agency: { id: 2, name: "Mondescale Nevers", city: "Nevers" },
      seoActions: {
        actions: [{
          priority: "medium",
          code: "LOCAL_CONTENT_THIN",
          title: "Enrichir le contenu",
          detail: "Ajouter du contenu local utile.",
          source: "LOCAL_CONTENT",
        }],
      },
    },
    {
      agency: { id: 1, name: "Mondescale Gien", city: "Gien" },
      seoActions: {
        actions: [{
          priority: "high",
          code: "RANKING_NEAR_TOP10",
          title: "Renforcer la page services",
          detail: "Optimiser la page déjà classée 13e.",
          source: "LOCAL_RANKINGS",
        }],
      },
    },
  ]);

  assert.equal(result.total, 2);
  assert.equal(result.agenciesWithActions, 2);
  assert.equal(result.actions[0].agency.city, "Gien");
  assert.equal(result.actions[0].source, "LOCAL_RANKINGS");
  assert.equal(result.actions[0].scoring.baseScore, 90);
});

test("network queue reports when learning actually influenced priorities", () => {
  const result = networkSeoPriorities([
    {
      agency: { id: 1, name: "Mondescale Gien", city: "Gien" },
      seoActions: {
        actions: [{
          priority: "high",
          code: "RANKING_NEAR_TOP10",
          title: "Renforcer la page services",
          detail: "Optimiser une page proche du top 10.",
          source: "LOCAL_RANKINGS",
        }],
      },
    },
  ], 25, {
    groups: [{
      source: "LOCAL_RANKINGS",
      code: "RANKING_NEAR_TOP10",
      samples: 6,
      confidence: "medium",
      improvementRate: 0.833,
      averageDelta: 5,
    }],
  });

  assert.equal(result.learningApplied, true);
  assert.ok(result.actions[0].learningBonus > 0);
  assert.equal(result.actions[0].scoring.learning.applied, true);
});

test("network queue respects a bounded result limit", () => {
  const result = networkSeoPriorities([
    {
      agency: { id: 1, name: "Agence", city: "Gien" },
      seoActions: {
        actions: Array.from({ length: 12 }, (_, index) => ({
          priority: "medium",
          code: `ACTION_${index}`,
          title: `Action ${index}`,
          detail: "À traiter",
          source: "LOCAL_CONTENT",
        })),
      },
    },
  ], 5);

  assert.equal(result.total, 12);
  assert.equal(result.actions.length, 5);
});
