"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { auditLocalIntentTargetMapping } = require("../src/modules/minisite-structured-data/local-intent-target-mapping");

function site(pages) { return { agency: { city: "Gien" }, pages: pages.map((page) => ({ published: true, ...page })) }; }

test("MSE-25.28 rejects a false local intent when city and service live on different pages", () => {
  const result = auditLocalIntentTargetMapping(site([
    { slug: "accueil", title: "Agence de voyages à Gien", blocks: [{ content: { text: "Bienvenue dans notre agence de voyages à Gien." } }] },
    { slug: "croisieres", title: "Nos croisières", blocks: [{ content: { text: "Découvrez notre sélection de croisières." } }] },
  ]));
  const cruise = result.intents.find((intent) => intent.key === "cruise");
  assert.equal(cruise.mapped, false);
  assert.equal(cruise.diffuse, true);
  assert.deepEqual(cruise.targets, []);
  assert.ok(result.gaps.some((gap) => gap.code === "local-intent-cruise-diffuse"));
});

test("MSE-25.28 accepts an intent only when a published page contains both city and intent", () => {
  const result = auditLocalIntentTargetMapping(site([
    { slug: "accueil", title: "Agence de voyages à Gien", blocks: [{ content: { text: "Bienvenue à Gien." } }] },
    { slug: "croisieres", title: "Croisières au départ de votre agence à Gien", blocks: [{ content: { text: "Nos conseillers à Gien organisent vos croisières." } }] },
  ]));
  const cruise = result.intents.find((intent) => intent.key === "cruise");
  assert.equal(cruise.mapped, true);
  assert.equal(cruise.diffuse, false);
  assert.equal(cruise.targets[0].slug, "croisieres");
});
