"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  citationConsistencyCheck,
  applyLocalCitationsToReadiness,
} = require("./local-citations-readiness");

function listing(overrides = {}) {
  return {
    id: overrides.id || 1,
    listingUrl: overrides.listingUrl ?? "https://example.com/agence",
    nameCorrect: overrides.nameCorrect ?? true,
    addressCorrect: overrides.addressCorrect ?? true,
    phoneCorrect: overrides.phoneCorrect ?? true,
    websiteCorrect: overrides.websiteCorrect ?? true,
    hoursCorrect: overrides.hoursCorrect ?? true,
    categoryCorrect: overrides.categoryCorrect ?? true,
    lastCheckedAt: overrides.lastCheckedAt || null,
    directory: overrides.directory || { name: "Annuaire test", active: true },
  };
}

test("all published active citations can be fully consistent", () => {
  const check = citationConsistencyCheck([
    listing({ id: 1 }),
    listing({ id: 2, directory: { name: "Annuaire B", active: true } }),
  ]);

  assert.equal(check.passed, true);
  assert.equal(check.publishedListings, 2);
  assert.equal(check.consistentListings, 2);
  assert.equal(check.consistencyRate, 1);
  assert.deepEqual(check.inconsistencies, []);
});

test("citation readiness reports the exact inconsistent fields", () => {
  const check = citationConsistencyCheck([
    listing({
      addressCorrect: false,
      phoneCorrect: false,
      hoursCorrect: false,
    }),
  ]);

  assert.equal(check.passed, false);
  assert.deepEqual(check.inconsistencies[0].fields, [
    "adresse",
    "téléphone",
    "horaires",
  ]);
});

test("inactive directories and listings without a public URL do not create false inconsistencies", () => {
  const check = citationConsistencyCheck([
    listing({
      directory: { name: "Ancien annuaire", active: false },
      addressCorrect: false,
    }),
    listing({
      id: 2,
      listingUrl: null,
      phoneCorrect: false,
      directory: { name: "À créer", active: true },
    }),
  ]);

  assert.equal(check.publishedListings, 0);
  assert.equal(check.inconsistencies.length, 0);
  assert.equal(check.passed, false);
});

test("citation readiness remains an advisory check and does not alter launch scoring", () => {
  const report = {
    version: "2.0",
    readiness: { score: 95, ready: true, blockers: [] },
    checks: [{ code: "SEO", required: true, passed: true }],
  };
  const citationCheck = citationConsistencyCheck([
    listing({ addressCorrect: false }),
  ]);
  const next = applyLocalCitationsToReadiness(report, citationCheck);

  assert.equal(next.version, "2.1");
  assert.equal(next.readiness.score, 95);
  assert.equal(next.readiness.ready, true);
  assert.equal(next.checks.at(-1).code, "LOCAL_CITATIONS");
  assert.equal(next.checks.at(-1).required, false);
});
