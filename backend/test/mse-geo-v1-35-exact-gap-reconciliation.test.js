"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const service = require("../src/knowledge/agent-gap-reconciliation.service");

test("normalizes accents, case and whitespace for exact equality only", () => {
  assert.equal(service.normalized("  Île   MAURICE "), "ile maurice");
});

test("reconciles only exact normalized titles", () => {
  const gaps = [
    { query: "Sicile", normalizedQuery: "sicile" },
    { query: "Voyage en Sicile", normalizedQuery: "voyage en sicile" },
  ];
  const targets = [{ id: "t1", type: "destination", slug: "sicile", title: "Sicile" }];
  const result = service.reconcileExact(gaps, targets);
  assert.equal(result[0].reconciliation.status, "exact_match");
  assert.deepEqual(result[0].reconciliation.candidate, { id: "t1", type: "destination", slug: "sicile", title: "Sicile" });
  assert.equal(result[1].reconciliation.status, "unmatched");
});

test("multiple exact target titles remain ambiguous and never auto-select", () => {
  const result = service.reconcileExact(
    [{ query: "Croisière", normalizedQuery: "croisiere" }],
    [
      { id: "a", type: "travel_theme", slug: "croisiere", title: "Croisière" },
      { id: "b", type: "cruise", slug: "croisiere-produit", title: "Croisière" },
    ]
  );
  assert.equal(result[0].reconciliation.status, "ambiguous_exact");
  assert.equal(result[0].reconciliation.candidate, null);
  assert.equal(result[0].reconciliation.candidates.length, 2);
});

test("report composes read-only gap and matrix loaders without writes", async () => {
  const gapLoader = async () => ({
    mode: "read-only", inference: false, source: "knowledge-search-audit",
    totalUnknownSearches: 2, uniqueGapCount: 1,
    gaps: [{ siteSlug: "maurepas", query: "Sicile", normalizedQuery: "sicile", occurrences: 2, firstSeenAt: "2026-09-08T08:00:00Z", lastSeenAt: "2026-09-08T09:00:00Z" }],
  });
  const matrixLoader = async () => ({
    mode: "read-only", inference: false,
    targets: [{ id: "t1", type: "destination", slug: "sicile", title: "Sicile" }],
  });
  const result = await service.report({ gapLoader, matrixLoader });
  assert.equal(result.reconciliation.mode, "exact-only");
  assert.equal(result.reconciliation.inference, false);
  assert.equal(result.reconciliation.fuzzy, false);
  assert.equal(result.reconciliation.exactMatchCount, 1);
});

test("network route exposes exact reconciliation as GET only", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/knowledge/network-geo.routes.js"), "utf8");
  assert.match(source, /router\.get\("\/agent-gap-reconciliation"/);
  assert.doesNotMatch(source, /router\.post\("\/agent-gap-reconciliation"/);
});
