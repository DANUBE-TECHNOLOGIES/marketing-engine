"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  top10Goal,
  keywordGoals,
  localSeoGoals,
} = require("./local-seo-goals");

test("top10 goal is derived from fresh tracked keywords and near-top10 opportunities", () => {
  const goal = top10Goal({
    freshKeywords: 8,
    top10Keywords: 2,
    opportunities: [
      { type: "near_top10", keyword: "agence voyage Gien", position: 12 },
      { type: "near_top10", keyword: "voyage sur mesure Gien", position: 15 },
      { type: "visible_but_weak", keyword: "croisiere Gien", position: 28 },
    ],
  });

  assert.equal(goal.current, 2);
  assert.equal(goal.target, 4);
  assert.equal(goal.remaining, 2);
  assert.equal(goal.status, "in_progress");
});

test("keyword goals only target tracked opportunities already close to top10", () => {
  const goals = keywordGoals({
    opportunities: [
      { type: "near_top10", keywordId: 1, keyword: "voyage sur mesure Gien", city: "Gien", position: 14 },
      { type: "visible_but_weak", keywordId: 2, keyword: "croisiere Gien", city: "Gien", position: 30 },
    ],
  });

  assert.equal(goals.length, 1);
  assert.equal(goals[0].targetPosition, 10);
  assert.equal(goals[0].remainingPositions, 4);
});

test("goals remain not applicable when rankings are not yet measured", () => {
  const goals = localSeoGoals({ freshKeywords: 0, top10Keywords: 0, opportunities: [] });
  assert.equal(goals.primary.status, "not_applicable");
  assert.equal(goals.totalKeywordGoals, 0);
});
