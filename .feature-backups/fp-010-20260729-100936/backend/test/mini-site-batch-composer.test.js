"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeDestinationSlugs, clampLimit, buildBatchPlan, summarizeBatch } = require("../src/lib/miniSiteBatchComposer");

const site = { id: "site-1", slug: "ozoir", name: "Mondescale Ozoir", agency: { name: "Mondescale Ozoir" } };
const base = { status: "published", country: "France", highlights: [], themes: [], travelTypes: [], sections: [], faqs: [], relationsFrom: [] };
const destinations = [
  { ...base, id: "d1", slug: "budapest", name: "Budapest", summary: "City-break sur le Danube." },
  { ...base, id: "d2", slug: "lisbonne", name: "Lisbonne", summary: "Capitale lumineuse." },
];

test("normalise et déduplique les slugs", () => {
  assert.deepEqual(normalizeDestinationSlugs(" Budapest,lisbonne,budapest "), ["budapest", "lisbonne"]);
});

test("borne la taille des lots", () => {
  assert.equal(clampLimit("0"), 25);
  assert.equal(clampLimit("250"), 100);
  assert.equal(clampLimit("12"), 12);
});

test("prépare créations, mises à jour et ignorés", () => {
  const existingPages = [{ id: "p1", slug: "budapest" }];
  const skipped = buildBatchPlan({ destinations, existingPages, site, agency: site.agency, candidates: destinations, options: { overwrite: false } });
  assert.equal(skipped[0].action, "skip");
  assert.equal(skipped[1].action, "create");
  const overwritten = buildBatchPlan({ destinations, existingPages, site, agency: site.agency, candidates: destinations, options: { overwrite: true, publish: true } });
  assert.equal(overwritten[0].action, "update");
  assert.equal(overwritten[0].data.site.connect.id, "site-1");
  assert.equal(overwritten[0].data.status, "published");
  assert.equal(overwritten[0].data.published, true);
});

test("résume un résultat de lot", () => {
  assert.deepEqual(summarizeBatch([{ action: "create" }, { action: "update" }, { action: "skip" }, { action: "failed" }]), {
    total: 4, created: 1, updated: 1, skipped: 1, failed: 1,
  });
});
