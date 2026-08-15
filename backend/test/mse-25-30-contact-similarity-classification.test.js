"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pageKind,
  isBlockingPageKind,
  networkSimilarityReport,
} = require("../src/modules/minisite-seo-enrichment/similarity-guard");

function richText(text) {
  return [{ type: "rich_text", content: { title: "Nous contacter", html: `<p>${text}</p>` } }];
}

test("classifies contact pages separately from agency pages", () => {
  assert.equal(pageKind({ slug: "contact", title: "Contact agence" }), "contact");
  assert.equal(isBlockingPageKind("contact"), false);
  assert.equal(pageKind({ slug: "agence", title: "Notre agence" }), "agency");
  assert.equal(isBlockingPageKind("agency"), true);
});

test("identical contact pages remain visible but advisory", () => {
  const text = "Contactez notre équipe pour préparer votre voyage et obtenir toutes les informations nécessaires concernant votre projet, votre réservation, vos documents et votre départ avec un conseiller disponible pour répondre à vos questions.";
  const report = networkSimilarityReport([
    { agencyId: 8, siteSlug: "tui-store-melun", city: "Melun", pages: [{ slug: "contact", title: "Contact agence", optimizedBlocks: richText(text) }] },
    { agencyId: 9, siteSlug: "tui-store-amilly", city: "Amilly", pages: [{ slug: "contact", title: "Contact agence", optimizedBlocks: richText(text) }] },
  ], { threshold: 0.78, minimumWords: 20 });

  assert.equal(report.conflictCount, 1);
  assert.equal(report.blockingConflictCount, 0);
  assert.equal(report.advisoryConflictCount, 1);
  assert.equal(report.blocked, false);
  assert.equal(report.conflicts[0].pageKind, "contact");
  assert.equal(report.conflicts[0].severity, "advisory");
});
