"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { classify } = require("../scripts/mse-25-75-production-indexability-handoff");

function probe(status, json = null) {
  return { status, ok: status >= 200 && status < 300, error: null, json };
}

const gitReady = { error: null, containsRequiredCommit: true };
const publicReady = { status: 200, ok: true, error: null };
const robotsReady = { status: 200, ok: true, error: null };

test("MSE-25.75 declares production ready when runtime and public surface are healthy", () => {
  const result = classify({
    gitState: gitReady,
    health: probe(200, { ok: true }),
    readiness: probe(200, { verdict: "READY_FOR_GOOGLE_DISCOVERY", blockers: [] }),
    sitemap: publicReady,
    robots: robotsReady,
  });
  assert.equal(result.verdict, "PRODUCTION_READY");
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
});

test("MSE-25.75 preserves Search Console waiting state as production-ready", () => {
  const result = classify({
    gitState: gitReady,
    health: probe(200, { ok: true }),
    readiness: probe(200, { verdict: "READY_WAITING_FOR_SEARCH_CONSOLE_DATA", blockers: [] }),
    sitemap: publicReady,
    robots: robotsReady,
  });
  assert.equal(result.verdict, "PRODUCTION_READY_WAITING_FOR_SEARCH_CONSOLE_DATA");
  assert.equal(result.ready, true);
});

test("MSE-25.75 identifies a runtime that does not contain MSE-25.74", () => {
  const result = classify({
    gitState: { error: null, containsRequiredCommit: false },
    health: probe(200, { ok: true }),
    readiness: probe(404),
    sitemap: publicReady,
    robots: robotsReady,
  });
  assert.equal(result.verdict, "RUNTIME_NOT_DEPLOYED");
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("REQUIRED_COMMIT_NOT_DEPLOYED"));
  assert.ok(result.blockers.includes("RUNTIME_READINESS_ROUTE_MISSING"));
});

test("MSE-25.75 surfaces runtime authentication instead of misclassifying it as a missing route", () => {
  const result = classify({
    gitState: gitReady,
    health: probe(401),
    readiness: probe(401),
    sitemap: publicReady,
    robots: robotsReady,
  });
  assert.equal(result.verdict, "AUTH_REQUIRED");
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("RUNTIME_AUTH_REQUIRED"));
});

test("MSE-25.75 propagates concrete indexability blockers", () => {
  const result = classify({
    gitState: gitReady,
    health: probe(200, { ok: true }),
    readiness: probe(200, { verdict: "BLOCKED_INDEXABILITY", blockers: ["PUBLIC_SITEMAP_MISSING_EXPECTED_URLS"] }),
    sitemap: publicReady,
    robots: robotsReady,
  });
  assert.equal(result.verdict, "BLOCKED_INDEXABILITY");
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ["PUBLIC_SITEMAP_MISSING_EXPECTED_URLS"]);
});
