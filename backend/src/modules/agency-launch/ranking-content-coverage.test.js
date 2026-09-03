"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  keywordTerms,
  bestPublishedPage,
  mapRankingOpportunitiesToPages,
  applyRankingContentCoverage,
} = require("./ranking-content-coverage");

function page(slug, title, text, status = "published") {
  return {
    id: slug || "home",
    slug,
    title,
    h1: title,
    seoTitle: title,
    metaDescription: text,
    status,
    published: status === "published",
    blocks: [{ status: "published", content: { text } }],
    sections: [],
  };
}

test("keyword terms remove generic travel words and the local city", () => {
  assert.deepEqual(
    keywordTerms("agence de voyage sur mesure Gien", "Gien"),
    ["mesure"]
  );
});

test("a published services page is selected for a covered commercial intent", () => {
  const pages = [
    page("", "Agence de voyages à Gien", "Notre équipe vous accueille à Gien."),
    page(
      "services",
      "Voyages sur mesure à Gien",
      "Nous construisons votre voyage sur mesure avec itinéraire personnalisé, hôtels et transports adaptés."
    ),
  ];

  const target = bestPublishedPage(pages, "voyage sur mesure Gien", "Gien");
  assert.equal(target.slug, "services");
  assert.ok(target.coverage >= 0.5);
});

test("draft pages are never proposed as ranking targets", () => {
  const target = bestPublishedPage([
    page(
      "croisieres",
      "Croisières à Nevers",
      "Conseils pour votre prochaine croisière maritime.",
      "draft"
    ),
  ], "croisiere Nevers", "Nevers");

  assert.equal(target, null);
});

test("uncovered intent remains unmapped instead of creating a fake target", () => {
  const opportunities = mapRankingOpportunitiesToPages(
    {
      opportunities: [{
        priority: "medium",
        type: "not_found",
        keyword: "safari Tanzanie Gien",
        city: "Gien",
        position: null,
      }],
    },
    [page("services", "Nos services à Gien", "Circuits, séjours et accompagnement personnalisé.")]
  );

  assert.equal(opportunities[0].coverageStatus, "unmapped");
  assert.equal(opportunities[0].targetPage, null);
  assert.match(opportunities[0].action, /Aucune page publiée/);
});

test("coverage mapping enriches rankings without altering launch readiness", () => {
  const report = {
    version: "2.3",
    readiness: { score: 95, ready: true, blockers: [] },
    checks: [{
      code: "LOCAL_RANKINGS",
      opportunities: [{
        priority: "high",
        type: "near_top10",
        keyword: "voyage sur mesure Gien",
        city: "Gien",
        position: 13,
      }],
    }],
  };
  const next = applyRankingContentCoverage(report, [
    page("services", "Voyages sur mesure à Gien", "Création de voyages sur mesure et itinéraires personnalisés."),
  ]);

  assert.equal(next.version, "2.4");
  assert.equal(next.readiness.score, 95);
  assert.equal(next.readiness.ready, true);
  assert.equal(next.checks[0].mappedOpportunities, 1);
  assert.equal(next.checks[0].opportunities[0].targetPage.slug, "services");
});
