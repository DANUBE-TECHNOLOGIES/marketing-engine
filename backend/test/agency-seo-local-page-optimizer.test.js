"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildLocalPageOptimization, buildOptimizationPatch } = require("../src/modules/agency-seo/local-page-optimizer");

const site = { name: "Mondescale Gien", seoCity: "Gien", agency: { name: "Mondescale Voyages Gien", city: "Gien" } };

test("MSE-25.30 produces directly usable local homepage SEO fields", () => {
  const proposal = buildLocalPageOptimization(site, { slug: "accueil", pageType: "home", title: "Accueil" });
  assert.match(proposal.seoTitle, /Agence de voyages à Gien/i);
  assert.match(proposal.h1, /agence de voyages à Gien/i);
  assert.match(proposal.seoDescription, /Gien/);
  assert.match(proposal.introduction, /Gien/);
  assert.equal(proposal.optimization.autoPublish, false);
  assert.equal(proposal.optimization.requiresHumanReview, true);
});

test("MSE-25.30 optimizes a service page around its local commercial intent", () => {
  const page = { slug: "croisieres", pageType: "cruise", title: "Croisières", content: { existing: "preserved" } };
  const proposal = buildLocalPageOptimization(site, page);
  const patch = buildOptimizationPatch(page, proposal);
  assert.match(proposal.seoTitle, /Croisières à Gien/i);
  assert.match(proposal.h1, /Croisières à Gien/i);
  assert.equal(patch.content.existing, "preserved");
  assert.equal(patch.content.h1, proposal.h1);
});
