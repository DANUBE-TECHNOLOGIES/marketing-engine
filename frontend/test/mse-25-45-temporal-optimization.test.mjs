import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(ROOT, "..");
const require = createRequire(import.meta.url);
const {
  buildNetworkRankings,
  buildTemporalComparison,
  buildTemporalOptimization,
  percentDelta,
} = require(path.join(REPO, "backend/src/modules/public-conversion-engine/service.js"));

const dashboard = fs.readFileSync(path.join(ROOT, "app/conversion-intent/page.js"), "utf8");
const routes = fs.readFileSync(path.join(REPO, "backend/src/modules/public-conversion-engine/routes.js"), "utf8");
const service = fs.readFileSync(path.join(REPO, "backend/src/modules/public-conversion-engine/service.js"), "utf8");

test("MSE-25.45 temporal comparison requires usable evidence in both periods", () => {
  const result = buildTemporalComparison(
    [{ siteSlug: "a", pageSlug: "home", pageViews: 100, conversionEvents: 10, conversionRate: 10 }],
    [{ siteSlug: "a", pageSlug: "home", pageViews: 20, conversionEvents: 4, conversionRate: 20 }],
  );
  assert.equal(result.comparablePageCount, 0);
  assert.equal(result.comparisons[0].trend, "insufficient");
  assert.equal(result.comparisons[0].rateDeltaPoints, null);
});

test("MSE-25.45 detects meaningful improvement and degradation period over period", () => {
  const result = buildTemporalComparison(
    [
      { siteSlug: "a", pageSlug: "home", pageViews: 100, conversionEvents: 14, conversionRate: 14 },
      { siteSlug: "b", pageSlug: "home", pageViews: 100, conversionEvents: 5, conversionRate: 5 },
    ],
    [
      { siteSlug: "a", pageSlug: "home", pageViews: 100, conversionEvents: 10, conversionRate: 10 },
      { siteSlug: "b", pageSlug: "home", pageViews: 100, conversionEvents: 10, conversionRate: 10 },
    ],
  );
  assert.equal(result.comparablePageCount, 2);
  assert.equal(result.improvingCount, 1);
  assert.equal(result.degradingCount, 1);
  assert.equal(result.improving[0].siteSlug, "a");
  assert.equal(result.degrading[0].siteSlug, "b");
  assert.equal(result.degrading[0].rateDeltaPoints, -5);
});

test("MSE-25.45 keeps small temporal variations stable instead of overreacting", () => {
  const result = buildTemporalComparison(
    [{ siteSlug: "a", pageSlug: "services", pageViews: 100, conversionEvents: 11, conversionRate: 11 }],
    [{ siteSlug: "a", pageSlug: "services", pageViews: 100, conversionEvents: 10, conversionRate: 10 }],
  );
  assert.equal(result.stableCount, 1);
  assert.equal(result.comparisons[0].trend, "stable");
});

test("MSE-25.45 ranks only pages with usable current evidence", () => {
  const rankings = buildNetworkRankings([
    { siteSlug: "a", pageSlug: "destinations", pageViews: 100, conversionRate: 12 },
    { siteSlug: "b", pageSlug: "destinations", pageViews: 80, conversionRate: 8 },
    { siteSlug: "c", pageSlug: "destinations", pageViews: 20, conversionRate: 30 },
  ]);
  assert.equal(rankings.length, 2);
  assert.deepEqual(
    rankings.map((item) => [item.siteSlug, item.rank, item.peerCount]),
    [["a", 1, 2], ["b", 2, 2]],
  );
});

test("MSE-25.45 emits read-only temporal degradation priorities", () => {
  const currentPages = [
    { siteSlug: "a", pageSlug: "services", pageViews: 120, conversionEvents: 6, conversionRate: 5 },
  ];
  const previousPages = [
    { siteSlug: "a", pageSlug: "services", pageViews: 120, conversionEvents: 14, conversionRate: 11.67 },
  ];
  const temporal = buildTemporalOptimization(
    [{ siteSlug: "a", pageSlug: "services", action: "service_explore", events: 6 }],
    currentPages,
    [{ siteSlug: "a", pageSlug: "services", action: "service_explore", events: 14 }],
    previousPages,
  );
  assert.equal(temporal.degradingPriorities.length, 1);
  assert.equal(temporal.degradingPriorities[0].kind, "temporal-degradation");
  assert.equal(temporal.degradingPriorities[0].priority, "high");
});

test("MSE-25.45 handles zero previous baselines without infinite percentages", () => {
  assert.equal(percentDelta(0, 0), 0);
  assert.equal(percentDelta(10, 0), null);
});

test("MSE-25.45 summary reads two equal adjacent periods", () => {
  assert.match(service, /previousFrom/);
  assert.match(service, /readPeriod\(previousFrom, currentFrom\)/);
  assert.match(service, /currentPeriod:/);
  assert.match(service, /previousPeriod:/);
});

test("MSE-25.45 cockpit surfaces temporal comparison and network ranking without writes", () => {
  assert.match(dashboard, /Évolution période sur période/);
  assert.match(dashboard, /Dégradations à investiguer/);
  assert.match(dashboard, /Améliorations confirmées/);
  assert.match(dashboard, /Classement réseau par page comparable/);
  assert.match(dashboard, /strictement read-only/);
  assert.doesNotMatch(dashboard, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);
});

test("MSE-25.45 health keeps temporal evidence gates in later engine versions", () => {
  assert.match(routes, /version:\s*"25\.(?:45\.1|4[6-9]\.\d+|[5-9]\d?\.\d+)"/);
  assert.match(routes, /temporalComparison:\s*"current-vs-previous-equal-window"/);
  assert.match(routes, /evidenceGate:\s*"40-views-per-period"/);
  assert.match(routes, /optimizationMode:\s*"read-only-recommendations"/);
});
