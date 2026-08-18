"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildLocalPageOptimization, buildOptimizationPatch, buildLocalQualityUplift } = require("../src/modules/agency-seo/local-page-optimizer");

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

test("MSE-25.31 enriches only genuinely thin generated content and proposes published internal links", () => {
  const page = {
    slug: "croisieres",
    pageType: "cruise",
    title: "Croisières",
    introduction: "Découvrez nos croisières.",
    content: { seoOptimization: { version: "mse-25.30" } },
  };
  const uplift = buildLocalQualityUplift(site, page, {
    publishedPages: [
      { slug: "sejours", pageType: "stay", title: "Séjours", published: true, indexable: true },
      { slug: "circuits", pageType: "circuit", title: "Circuits", published: true, indexable: true },
      { slug: "brouillon", pageType: "custom", title: "Brouillon", published: false, indexable: true },
    ],
  });

  assert.equal(uplift.version, "mse-25.31");
  assert.equal(uplift.thinContent, true);
  assert.match(uplift.suggestedParagraph, /Gien/);
  assert.deepEqual(uplift.internalLinks.map((item) => item.href), ["/sejours", "/circuits"]);
  assert.ok(uplift.warningsTargeted.includes("THIN_CONTENT"));
  assert.ok(uplift.warningsTargeted.includes("EDITORIAL_INTERNAL_LINK_MISSING"));
  assert.equal(uplift.autoPublish, false);
});

test("MSE-25.31 never replaces an existing manual introduction", () => {
  const uplift = buildLocalQualityUplift(site, {
    slug: "sur-mesure",
    pageType: "custom",
    title: "Voyages sur mesure",
    introduction: "Texte éditorial rédigé manuellement par l'agence et volontairement conservé.",
    content: {},
  });

  assert.equal(uplift.preservesManualIntroduction, true);
  assert.equal(uplift.suggestedParagraph, null);
  assert.equal(uplift.requiresHumanReview, true);
});
