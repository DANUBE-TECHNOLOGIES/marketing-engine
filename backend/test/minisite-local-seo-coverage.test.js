"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { localSeoCoverageForSite, auditLocalSeoCoverage } = require("../src/modules/minisite-structured-data/local-seo-coverage");

function site({ title = "Agence de voyages", meta = "Conseils voyages", body = "Nos experts vous accompagnent.", city = "Gien" } = {}) {
  return { slug: "gien", agency: { name: "Mondescale Gien", city }, pages: [{ slug: "accueil", title: "Accueil", seoTitle: title, metaDescription: meta, status: "published", published: true, blocks: [{ status: "published", content: { text: body } }] }] };
}

test("MSE-25.24 detects a missing primary locality in title, meta and content", () => {
  const audit = localSeoCoverageForSite(site());
  assert.equal(audit.primaryCity, "Gien");
  assert.ok(audit.gaps.some((gap) => gap.code === "homepage-title-locality-missing"));
  assert.ok(audit.gaps.some((gap) => gap.code === "homepage-meta-locality-missing"));
  assert.ok(audit.gaps.some((gap) => gap.code === "homepage-content-locality-missing"));
  assert.equal(audit.status, "weak");
});

test("MSE-25.24 rewards explicit, natural local coverage", () => {
  const audit = localSeoCoverageForSite(site({ title: "Agence de voyages à Gien | Mondescale", meta: "Votre agence de voyages à Gien pour circuits, séjours et conseils sur mesure.", body: "Notre équipe de Gien vous accompagne dans tous vos projets de voyage." }));
  assert.equal(audit.score, 100);
  assert.equal(audit.status, "strong");
  assert.deepEqual(audit.missingCities, []);
});

test("MSE-25.24 reports uncovered secondary target cities without creating doorway pages", () => {
  const result = auditLocalSeoCoverage([site({ title: "Agence de voyages à Gien", meta: "Votre agence à Gien", body: "Conseillers voyages à Gien." })], { gien: { targetCities: ["Montargis", "Briare"] } });
  assert.deepEqual(result.sites[0].missingCities, ["Montargis", "Briare"]);
  assert.equal(result.sites[0].gaps.filter((gap) => gap.code === "target-city-uncovered").length, 2);
});
