"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { networkSimilarityReport, similarity } = require("../src/modules/minisite-seo-enrichment/similarity-guard");
const { MiniSiteSeoEnrichmentService } = require("../src/modules/minisite-seo-enrichment/service");

function richText(slug, text) {
  return {
    slug,
    optimizedBlocks: [
      { type: "rich_text", content: { title: `Conseils ${slug}`, text } },
    ],
  };
}

test("MSE-25.30 similarity ignores city names but detects duplicated page copy", () => {
  const common = "Nous construisons votre projet avec un accompagnement personnalisé, une sélection adaptée à votre budget, des conseils avant le départ et un suivi de proximité pour choisir les prestations utiles à votre séjour. ".repeat(8);
  const plans = [
    { agencyId: 1, siteSlug: "gien", city: "Gien", pages: [richText("circuits", `${common} Gien Briare`)] },
    { agencyId: 2, siteSlug: "nevers", city: "Nevers", pages: [richText("circuits", `${common} Nevers Marzy`)] },
  ];
  const report = networkSimilarityReport(plans, { threshold: 0.78, minimumWords: 40 });
  assert.equal(report.blocked, true);
  assert.equal(report.conflictCount, 1);
  assert.ok(report.conflicts[0].score >= 0.78);
});

test("MSE-25.30 differentiated copy stays below the blocking threshold", () => {
  const left = "Pour votre circuit, notre équipe prépare les étapes, les transferts et les visites afin de construire un itinéraire fluide. Nous privilégions le rythme, la cohérence des journées et les conseils pratiques avant le départ.".repeat(5);
  const right = "Pour votre séjour, nous comparons les hôtels, les clubs, les formules repas et les options famille. Notre accompagnement met l'accent sur le confort, les services sur place et la maîtrise du budget global.".repeat(5);
  assert.ok(similarity(left, right, ["Gien", "Nevers"]) < 0.78);
});

test("MSE-25.30 network rollout refuses writes when similarity guard is blocked", async () => {
  const service = new MiniSiteSeoEnrichmentService({ repository: {} });
  service.buildNetworkContentOptimization = async () => ({
    similarity: { blocked: true, conflictCount: 2, threshold: 0.78, conflicts: [{ score: 0.9 }] },
    summary: { agenciesProcessed: 2, pagesProcessed: 10, pagesChanged: 8, similarityConflicts: 2, rolloutBlocked: true },
    plans: [],
  });

  await assert.rejects(
    () => service.optimizeNetworkContent({ dryRun: false, confirm: true }),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, "MINISITE_SEO_NETWORK_SIMILARITY_BLOCKED");
      assert.equal(error.details.conflictCount, 2);
      return true;
    }
  );
});

test("MSE-25.30 network rollout still requires explicit confirmation", async () => {
  const service = new MiniSiteSeoEnrichmentService({ repository: {} });
  await assert.rejects(
    () => service.optimizeNetworkContent({ dryRun: false, confirm: false }),
    (error) => {
      assert.equal(error.status, 400);
      assert.equal(error.code, "MINISITE_SEO_NETWORK_ROLLOUT_CONFIRMATION_REQUIRED");
      return true;
    }
  );
});
