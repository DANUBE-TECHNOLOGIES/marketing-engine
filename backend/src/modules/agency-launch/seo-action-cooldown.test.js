"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applySeoActionCooldown,
} = require("./seo-action-cooldown");

const now = new Date("2026-08-11T12:00:00Z");

function queue(action) {
  return {
    version: "1.1",
    total: 1,
    highPriority: 1,
    actions: [action],
  };
}

test("recent ranking action is hidden during its 30 day cooldown", () => {
  const result = applySeoActionCooldown(
    queue({
      source: "LOCAL_RANKINGS",
      code: "RANKING_NEAR_TOP10",
      priority: "high",
      keywordId: 12,
      keyword: "voyage sur mesure Gien",
      title: "Renforcer la page services",
    }),
    [{
      source: "LOCAL_RANKINGS",
      code: "RANKING_NEAR_TOP10",
      keywordId: 12,
      executedAt: "2026-08-01T10:00:00Z",
    }],
    now
  );

  assert.equal(result.total, 0);
  assert.equal(result.suppressedCount, 1);
  assert.equal(result.suppressed[0].cooldown.cooldownDays, 30);
  assert.ok(result.suppressed[0].cooldown.remainingDays > 0);
});

test("same action code on another keyword remains visible", () => {
  const result = applySeoActionCooldown(
    queue({
      source: "LOCAL_RANKINGS",
      code: "RANKING_NEAR_TOP10",
      priority: "high",
      keywordId: 15,
      keyword: "croisiere Gien",
      title: "Renforcer croisières",
    }),
    [{
      source: "LOCAL_RANKINGS",
      code: "RANKING_NEAR_TOP10",
      keywordId: 12,
      keyword: "voyage sur mesure Gien",
      executedAt: "2026-08-01T10:00:00Z",
    }],
    now
  );

  assert.equal(result.total, 1);
  assert.equal(result.suppressedCount, 0);
});

test("citation action returns after shorter 14 day cooldown", () => {
  const result = applySeoActionCooldown(
    queue({
      source: "LOCAL_CITATIONS",
      code: "CITATION_INCONSISTENCY",
      priority: "high",
      title: "Corriger PagesJaunes",
    }),
    [{
      source: "LOCAL_CITATIONS",
      code: "CITATION_INCONSISTENCY",
      executedAt: "2026-07-20T10:00:00Z",
    }],
    now
  );

  assert.equal(result.total, 1);
  assert.equal(result.suppressedCount, 0);
});
