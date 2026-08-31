"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validate } = require("../src/routes/publicLeads");

function valid(overrides = {}) {
  return {
    project: "leisure",
    source: "general",
    siteSlug: "mondescale-gien",
    name: "Test Client",
    phone: "0612345678",
    email: "client@example.test",
    destination: "Sicile",
    dates: "Mai 2027",
    travellers: "2 adultes",
    ...overrides,
  };
}

test("111B validates optional attribution metadata without changing the lead contract", () => {
  const result = validate(valid({
    sourcePage: "/agence/mondescale-gien/inspiration/sicile",
    sourcePath: "/agence/mondescale-gien/demande-devis?source=general&utm_source=google",
    sourceReferrer: "https://example.test/agence/mondescale-gien/inspiration/sicile",
    utmSource: "google",
    utmMedium: "organic",
    utmCampaign: "sicile",
    utmContent: "hero",
    utmTerm: "voyage sicile",
  }));
  assert.ok(result.data);
  assert.equal(result.data.utmSource, "google");
  assert.equal(result.data.sourcePage, "/agence/mondescale-gien/inspiration/sicile");
});

test("111B remains backwards compatible when attribution is absent", () => {
  const result = validate(valid());
  assert.ok(result.data);
  assert.equal(result.data.sourcePage, "");
  assert.equal(result.data.utmSource, "");
});

test("111B limits untrusted attribution metadata", () => {
  const result = validate(valid({ sourceReferrer: "x".repeat(2500), utmCampaign: "y".repeat(500) }));
  assert.equal(result.data.sourceReferrer.length, 2000);
  assert.equal(result.data.utmCampaign.length, 240);
});

test("111B source contract wires browser attribution, persistence and ERP guard", () => {
  const root = path.resolve(__dirname, "..", "..");
  const form = fs.readFileSync(path.join(root, "frontend/components/public-site/SmartQuoteRequest.js"), "utf8");
  const route = fs.readFileSync(path.join(root, "backend/src/routes/publicLeads.js"), "utf8");
  const migration = fs.readFileSync(path.join(root, "backend/prisma/migrations/20260831130500_mse_25_111b_lead_attribution/migration.sql"), "utf8");
  for (const field of ["sourcePage", "sourcePath", "sourceReferrer", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm"]) {
    assert.match(form, new RegExp(field));
    assert.match(route, new RegExp(field));
    assert.match(migration, new RegExp(`"${field}"`));
  }
  assert.match(form, /document\.referrer/);
  assert.match(form, /utm_source/);
  assert.match(route, /'DISABLED'/);
});
