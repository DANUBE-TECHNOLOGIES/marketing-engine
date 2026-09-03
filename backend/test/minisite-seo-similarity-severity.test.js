"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  networkSimilarityReport,
  isBlockingPageKind,
} = require("../src/modules/minisite-seo-enrichment/similarity-guard");

function blocks(text) {
  return [{ type: "rich_text", content: { title: "Titre", text } }];
}

const shared = "Notre équipe vous accompagne pour comparer les solutions, préparer votre projet, organiser chaque étape et bénéficier d'un suivi personnalisé avant votre départ. ".repeat(12);

test("MSE-25.30 keeps strategic local SEO page kinds blocking", () => {
  for (const kind of ["home", "agency", "cruise", "circuit", "custom", "stay", "ticketing"]) {
    assert.equal(isBlockingPageKind(kind), true);
  }
  assert.equal(isBlockingPageKind("contact"), false);
  assert.equal(isBlockingPageKind("engagements"), false);
});

test("MSE-25.30 similar commercial pages block rollout", () => {
  const report = networkSimilarityReport([
    { agencyId: 1, siteSlug: "gien", city: "Gien", pages: [{ slug: "circuits", title: "Circuits", optimizedBlocks: blocks(shared) }] },
    { agencyId: 2, siteSlug: "nevers", city: "Nevers", pages: [{ slug: "circuits", title: "Circuits", optimizedBlocks: blocks(shared) }] },
  ]);

  assert.equal(report.blocked, true);
  assert.equal(report.blockingConflictCount, 1);
  assert.equal(report.advisoryConflictCount, 0);
  assert.equal(report.blockingConflicts[0].severity, "blocking");
});

test("MSE-25.30 similar institutional pages remain visible but advisory", () => {
  const report = networkSimilarityReport([
    { agencyId: 1, siteSlug: "gien", city: "Gien", pages: [{ slug: "engagements", title: "Nos engagements", optimizedBlocks: blocks(shared) }] },
    { agencyId: 2, siteSlug: "nevers", city: "Nevers", pages: [{ slug: "engagements", title: "Nos engagements", optimizedBlocks: blocks(shared) }] },
  ]);

  assert.equal(report.conflictCount, 1);
  assert.equal(report.blockingConflictCount, 0);
  assert.equal(report.advisoryConflictCount, 1);
  assert.equal(report.blocked, false);
  assert.equal(report.advisoryConflicts[0].severity, "advisory");
});
