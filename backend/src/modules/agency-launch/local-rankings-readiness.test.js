"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  rankingOpportunity,
  localRankingCheck,
  applyLocalRankingsToReadiness,
} = require("./local-rankings-readiness");

const NOW = new Date("2026-08-11T12:00:00Z");

function keyword(overrides = {}) {
  return {
    id: overrides.id || 1,
    keyword: overrides.keyword || "agence de voyage gien",
    city: overrides.city || "Gien",
    active: overrides.active ?? true,
    lastCheckStatus: overrides.lastCheckStatus || "ok",
    results: overrides.results || [],
  };
}

test("no active keyword remains advisory and requests a local tracking set", () => {
  const check = localRankingCheck([], NOW);
  assert.equal(check.required, false);
  assert.equal(check.passed, false);
  assert.equal(check.activeKeywords, 0);
  assert.match(check.recommendation, /requêtes locales/);
});

test("stale measurements are surfaced instead of being treated as current visibility", () => {
  const check = localRankingCheck([
    keyword({
      results: [{ found: true, position: 5, checkedAt: "2026-05-01T12:00:00Z" }],
    }),
  ], NOW);

  assert.equal(check.passed, false);
  assert.equal(check.freshKeywords, 0);
  assert.equal(check.missingOrStale.length, 1);
  assert.equal(check.top10Keywords, 0);
  assert.equal(check.opportunities.length, 0);
});

test("fresh local rankings expose top 10 and top 20 coverage", () => {
  const check = localRankingCheck([
    keyword({
      id: 1,
      keyword: "agence de voyage gien",
      results: [{ found: true, position: 4, checkedAt: "2026-08-05T12:00:00Z" }],
    }),
    keyword({
      id: 2,
      keyword: "voyage sur mesure gien",
      results: [{ found: true, position: 17, checkedAt: "2026-08-04T12:00:00Z" }],
    }),
    keyword({
      id: 3,
      keyword: "croisiere gien",
      results: [{ found: false, position: null, checkedAt: "2026-08-03T12:00:00Z" }],
    }),
  ], NOW);

  assert.equal(check.passed, true);
  assert.equal(check.freshKeywords, 3);
  assert.equal(check.top10Keywords, 1);
  assert.equal(check.top20Keywords, 2);
  assert.equal(check.top10Rate, 0.333);
  assert.equal(check.top20Rate, 0.667);
  assert.equal(check.opportunities[0].type, "near_top10");
  assert.equal(check.opportunities[0].position, 17);
  assert.equal(check.opportunities[0].priority, "high");
  assert.equal(check.opportunities[1].type, "not_found");
});

test("positions 11 to 20 are prioritized over weaker visibility", () => {
  const nearTop10 = rankingOpportunity({
    fresh: true,
    found: true,
    keywordId: 1,
    keyword: "voyage sur mesure gien",
    city: "Gien",
    position: 12,
  });
  const weak = rankingOpportunity({
    fresh: true,
    found: true,
    keywordId: 2,
    keyword: "croisiere gien",
    city: "Gien",
    position: 34,
  });

  assert.equal(nearTop10.priority, "high");
  assert.equal(nearTop10.type, "near_top10");
  assert.equal(weak.priority, "medium");
  assert.equal(weak.type, "visible_but_weak");
});

test("ranking readiness remains advisory and does not alter launch score", () => {
  const report = {
    version: "2.1",
    readiness: { score: 100, ready: true, blockers: [] },
    checks: [],
  };
  const next = applyLocalRankingsToReadiness(report, localRankingCheck([], NOW));

  assert.equal(next.version, "2.3");
  assert.equal(next.readiness.score, 100);
  assert.equal(next.readiness.ready, true);
  assert.equal(next.checks.at(-1).code, "LOCAL_RANKINGS");
});
