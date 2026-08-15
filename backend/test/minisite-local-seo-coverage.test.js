"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { localSeoCoverageForSite, auditLocalSeoCoverage } = require("../src/modules/minisite-structured-data/local-seo-coverage");

function site({ title = "Agence de voyages", meta = "Conseils voyages", body = "Nos experts vous accompagnent.", heading = "Votre agence de voyages", city = "Gien", completeNap = true } = {}) {
  return { slug: "gien", agency: { name: "Mondescale Gien", city, address: completeNap ? "12 rue de Paris" : null, postalCode: completeNap ? "45500" : null, phone: completeNap ? "02 38 00 00 00" : null }, pages: [{ slug: "accueil", title: "Accueil", seoTitle: title, metaDescription: meta, status: "published", published: true, blocks: [{ status: "published", content: { heading, text: body } }] }] };
}

test("MSE-25.24 detects a missing primary locality in title, meta, H1 and content", () => {
  const audit = localSeoCoverageForSite(site());
  assert.equal(audit.primaryCity, "Gien");
  assert.ok(audit.gaps.some((gap) => gap.code === "homepage-title-locality-missing"));
  assert.ok(audit.gaps.some((gap) => gap.code === "homepage-meta-locality-missing"));
  assert.ok(audit.gaps.some((gap) => gap.code === "homepage-h1-locality-missing"));
  assert.ok(audit.gaps.some((gap) => gap.code === "homepage-content-locality-missing"));
  assert.equal(audit.status, "weak");
});

test("MSE-25.24 rewards explicit natural local coverage with complete NAP and schema", () => {
  const audit = localSeoCoverageForSite(site({ title: "Agence de voyages à Gien | Mondescale", meta: "Votre agence de voyages à Gien pour circuits, séjours et conseils sur mesure.", heading: "Votre agence de voyages à Gien", body: "Notre équipe de Gien vous accompagne dans tous vos projets de voyage." }));
  assert.equal(audit.score, 100);
  assert.equal(audit.status, "strong");
  assert.equal(audit.nap.complete, true);
  assert.equal(audit.structuredData.hasTravelAgency, true);
  assert.equal(audit.structuredData.hasLocalBusiness, true);
  assert.equal(audit.structuredData.hasAddress, true);
  assert.equal(audit.structuredData.hasTelephone, true);
  assert.deepEqual(audit.missingCities, []);
});

test("MSE-25.24 flags incomplete NAP before local indexation quality is considered strong", () => {
  const audit = localSeoCoverageForSite(site({ title: "Agence de voyages à Gien", meta: "Votre agence à Gien", heading: "Agence de voyages à Gien", body: "Conseillers voyages à Gien.", completeNap: false }));
  assert.equal(audit.nap.complete, false);
  assert.ok(audit.gaps.some((gap) => gap.code === "nap-incomplete"));
  assert.ok(audit.gaps.some((gap) => gap.code === "local-schema-nap-incomplete"));
  assert.notEqual(audit.status, "strong");
});

test("MSE-25.24 reports uncovered secondary target cities without creating doorway pages", () => {
  const result = auditLocalSeoCoverage([site({ title: "Agence de voyages à Gien", meta: "Votre agence à Gien", heading: "Agence de voyages à Gien", body: "Conseillers voyages à Gien." })], { gien: { targetCities: ["Montargis", "Briare"] } });
  assert.deepEqual(result.sites[0].missingCities, ["Montargis", "Briare"]);
  assert.equal(result.sites[0].gaps.filter((gap) => gap.code === "target-city-uncovered").length, 2);
});
