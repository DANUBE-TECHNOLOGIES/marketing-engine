import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(ROOT, "..");
const require = createRequire(import.meta.url);
const {
  buildBenchmarks,
  buildOptimizationInsights,
  confidenceForViews,
} = require(path.join(REPO, "backend/src/modules/public-conversion-engine/service.js"));

const dashboard = fs.readFileSync(path.join(ROOT, "app/conversion-intent/page.js"), "utf8");
const routes = fs.readFileSync(path.join(REPO, "backend/src/modules/public-conversion-engine/routes.js"), "utf8");

test("MSE-25.45 refuses optimization claims on insufficient traffic", () => {
  assert.equal(confidenceForViews(12), "insufficient");
  const insights = buildOptimizationInsights([
    { siteSlug: "a", pageSlug: "home", action: "page_view", events: 12 },
  ], [
    { siteSlug: "a", pageSlug: "home", pageViews: 12, conversionEvents: 0, conversionRate: 0 },
  ]);
  assert.equal(insights.opportunityCount, 0);
  assert.equal(insights.usableEvidencePageCount, 0);
});

test("MSE-25.45 flags high-traffic pages with zero conversion", () => {
  const pages = [
    { siteSlug: "a", pageSlug: "services", pageViews: 100, conversionEvents: 0, conversionRate: 0 },
  ];
  const insights = buildOptimizationInsights([
    { siteSlug: "a", pageSlug: "services", action: "page_view", events: 100 },
  ], pages);
  assert.equal(insights.opportunities[0].priority, "critical");
  assert.equal(insights.opportunities[0].kind, "high-traffic-zero-conversion");
  assert.equal(insights.opportunities[0].confidence, "strong");
});

test("MSE-25.45 builds page-type network medians from usable evidence only", () => {
  const benchmarks = buildBenchmarks([
    { siteSlug: "a", pageSlug: "home", pageViews: 100, conversionRate: 10 },
    { siteSlug: "b", pageSlug: "home", pageViews: 80, conversionRate: 20 },
    { siteSlug: "c", pageSlug: "home", pageViews: 12, conversionRate: 90 },
  ]);
  assert.deepEqual(benchmarks.home, { sampleSize: 2, medianRate: 15, bestRate: 20 });
});

test("MSE-25.45 detects underperformance and preserves strong references", () => {
  const pages = [
    { siteSlug: "a", pageSlug: "destinations", pageViews: 100, conversionEvents: 4, conversionRate: 4 },
    { siteSlug: "b", pageSlug: "destinations", pageViews: 100, conversionEvents: 10, conversionRate: 10 },
    { siteSlug: "c", pageSlug: "destinations", pageViews: 100, conversionEvents: 20, conversionRate: 20 },
  ];
  const rows = pages.flatMap((page) => [
    { siteSlug: page.siteSlug, pageSlug: page.pageSlug, action: "page_view", events: page.pageViews },
    { siteSlug: page.siteSlug, pageSlug: page.pageSlug, action: "destination_explore", events: page.conversionEvents },
  ]);
  const insights = buildOptimizationInsights(rows, pages);
  assert.equal(insights.opportunities.some((item) => item.siteSlug === "a" && item.kind === "below-network-benchmark"), true);
  assert.equal(insights.strengths.some((item) => item.siteSlug === "c"), true);
});

test("MSE-25.45 keeps the optimization loop advisory and read-only", () => {
  assert.match(routes, /optimizationMode:\s*"read-only-recommendations"/);
  assert.match(dashboard, /strictement read-only/);
  assert.match(dashboard, /aucune page, aucun CTA et aucun contenu public n’est modifié automatiquement/);
  assert.match(dashboard, /Priorités d’optimisation/);
  assert.match(dashboard, /Références à préserver/);
  assert.doesNotMatch(dashboard, /fetch\([^)]*method:\s*["']POST["']/s);
});
