"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { auditLocalSearchIntentCoverage } = require("../src/modules/minisite-structured-data/local-search-intent-coverage");

function site(body) { return { agency: { city: "Gien" }, pages: [{ published: true, seoTitle: "Agence de voyages à Gien", metaDescription: "Conseils voyages à Gien", blocks: [{ content: { text: body } }] }] }; }

test("MSE-25.27 distinguishes local commercial intents from a simple city mention", () => {
  const result = auditLocalSearchIntentCoverage(site("Notre agence de voyages à Gien vous accompagne."));
  assert.equal(result.localityPresent, true);
  assert.equal(result.intents.find((item) => item.key === "agency").localQualified, true);
  assert.equal(result.intents.find((item) => item.key === "cruise").localQualified, false);
  assert.ok(result.gaps.some((gap) => gap.code === "local-intent-cruise-missing"));
});

test("MSE-25.27 rewards broad useful local intent coverage", () => {
  const result = auditLocalSearchIntentCoverage(site("Notre agence de voyages à Gien propose conseil voyage, voyages sur mesure, séjours, circuits, croisières, billetterie et vols. Contactez nos conseillers pour un rendez-vous en agence physique."));
  assert.equal(result.score, 100);
  assert.equal(result.status, "strong");
  assert.equal(result.coveredIntentCount, result.intentCount);
});
