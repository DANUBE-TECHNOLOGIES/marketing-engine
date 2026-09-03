"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  rankingMomentum,
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

test("ranking momentum detects improvement, stability and decline", () => {
  const improving = rankingMomentum(keyword({
    results: [
      { found: true, position: 8, checkedAt: "2026-08-10T12:00:00Z" },
      { found: true, position: 12, checkedAt: "2026-08-03T12:00:00Z" },
      { found: true, position: 16, checkedAt: "2026-07-27T12:00:00Z" },
    ],
  }));
  const stable = rankingMomentum(keyword({
    results: [
      { found: true, position: 11, checkedAt: "2026-08-10T12:00:00Z" },
      { found: true, position: 12, checkedAt: "2026-08-03T12:00:00Z" },
    ],
  }));
  const declining = rankingMomentum(keyword({
    results: [
      { found: true, position: 18, checkedAt: "2026-08-10T12:00:00Z" },
      { found: true, position: 13, checkedAt: "2026-08-03T12:00:00Z" },
    ],
  }));

  assert.equal(improving.status, "improving");
  assert.equal(improving.delta, 4);
  assert.equal(improving.bestPosition, 8);
  assert.equal(stable.status, "stable");
  assert.equal(declining.status, "declining");
  assert.equal(declining.delta, -5);
});

test("fresh local rankings expose top 10, top 20 and momentum coverage", () => {
  const check = localRankingCheck([
    keyword({
      id: 1,
      keyword: "agence de voyage gien",
      results: [
        { found: true, position: 4, checkedAt: "2026-08-05T12:00:00Z" },
        { found: true, position: 7, checkedAt: "2026-07-29T12:00:00Z" },
      ],
    }),
    keyword({
      id: 2,
      keyword: "voyage sur mesure gien",
      results: [
        { found: true, position: 17, checkedAt: "2026-08-04T12:00:00Z" },
        { found: true, position: 14, checkedAt: "2026-07-28T12:00:00Z" },
      ],
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
  assert.equal(check.improvingKeywords, 1);
  assert.equal(check.decliningKeywords, 1);
  assert.equal(check.opportunities[0].type, "near_top10");
  assert.equal(check.opportunities[0].position, 17);
  assert.equal(check.opportunities[0].momentum.status, "declining");
});

test("declining weak visibility is escalated while improving visibility is consolidated", () => {
  const declining = rankingOpportunity({
    fresh: true,
    found: true,
    keywordId: 1,
    keyword: "croisiere gien",
    city: "Gien",
    position: 31,
    momentum: { status: "declining" },
  });
  const improving = rankingOpportunity({
    fresh: true,
    found: true,
    keywordId: 2,
    keyword: "voyage sur mesure gien",
    city: "Gien",
    position: 15,
    momentum: { status: "improving" },
  });

  assert.equal(declining.priority, "high");
  assert.match(declining.action, /recule/);
  assert.equal(improving.priority, "high");
  assert.match(improving.action, /progresse déjà/);
});

test("ranking readiness remains advisory and does not alter launch score", () => {
  const report = {
    version: "2.6",
    readiness: { score: 100, ready: true, blockers: [] },
    checks: [],
  };
  const next = applyLocalRankingsToReadiness(report, localRankingCheck([], NOW));

  assert.equal(next.version, "2.7");
  assert.equal(next.readiness.score, 100);
  assert.equal(next.readiness.ready, true);
  assert.equal(next.checks.at(-1).code, "LOCAL_RANKINGS");
});
