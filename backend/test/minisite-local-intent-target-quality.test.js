"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { auditLocalIntentTargetQuality } = require("../src/modules/minisite-structured-data/local-intent-target-quality");

function site({ title, meta, heading, body }) { return { agency: { city: "Gien" }, pages: [{ slug: "accueil", published: true, seoTitle: title, metaDescription: meta, blocks: [{ content: { heading, text: body } }] }] }; }
function filler() { return Array.from({ length: 130 }, (_, index) => `conseil${index}`).join(" "); }

test("MSE-25.29 detects a mapped core intent whose target page remains weak", () => {
  const result = auditLocalIntentTargetQuality(site({ title: "Agence Mondescale", meta: "Voyages", heading: "Agence de voyages", body: "Notre agence de voyages à Gien vous accueille." }));
  assert.equal(result.intents.find((item) => item.key === "agency").mapped, true);
  assert.equal(result.intents.find((item) => item.key === "agency").qualityStatus, "weak");
  assert.ok(result.gaps.some((gap) => gap.code === "local-intent-agency-target-quality-weak"));
});

test("MSE-25.29 rewards a target page that carries city and intent through title meta H1 and useful body", () => {
  const result = auditLocalIntentTargetQuality(site({ title: "Agence de voyages à Gien | Mondescale", meta: "Votre agence de voyages à Gien pour préparer vos vacances.", heading: "Votre agence de voyages à Gien", body: `Notre agence de voyages à Gien accompagne vos projets. ${filler()}` }));
  const core = result.intents.find((item) => item.key === "agency");
  assert.equal(core.qualityScore, 100);
  assert.equal(core.qualityStatus, "strong");
  assert.equal(result.coreTargetStrong, true);
});
