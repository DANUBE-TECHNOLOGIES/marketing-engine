"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { semanticPlan, opportunityForCoverage } = require("../src/modules/minisite-semantic-engine/engine");
const { managedRoutePages } = require("../src/modules/minisite-semantic-engine/service");

function route(slug, title, seoTitle, metaDescription) {
  return {
    id: `p-${slug}`,
    slug,
    title,
    seoTitle,
    metaDescription,
    status: "published",
    published: true,
  };
}

test("managed canonical commercial routes remain visible to semantic coverage", () => {
  const summary = {
    pages: [
      route("croisieres", "Croisières", "Croisières à Gien | Mondescale", "Préparez votre croisière à Gien avec votre agence."),
      route("circuits", "Circuits", "Circuits à Gien | Mondescale", "Découvrez nos circuits à Gien avec votre agence."),
      route("sejours", "Séjours", "Séjours à Gien | Mondescale", "Trouvez votre séjour à Gien avec votre agence."),
      route("billetterie-vols", "Billetterie et vols", "Billets d’avion et vols à Gien | Mondescale", "Billetterie et vols à Gien avec votre agence."),
      route("voyages-sur-mesure", "Voyages sur mesure", "Voyages sur mesure à Gien | Mondescale", "Construisez votre voyage sur mesure à Gien."),
    ],
  };
  const excluded = summary.pages.map((page) => ({ pageId: page.id, slug: page.slug, title: page.title, reason: "canonical-route-managed" }));
  const pages = managedRoutePages(summary, excluded);
  assert.equal(pages.length, 5);
  assert.ok(pages.every((page) => page.managedRoute === true));
  assert.ok(pages.every((page) => page.writeEligible === false));

  const plan = semanticPlan({
    id: "site-gien",
    slug: "gien",
    agencyId: 4,
    agency: { id: 4, city: "Gien" },
    pages,
  });

  for (const key of ["cruise", "circuit", "stay", "ticketing", "tailor-made"]) {
    const coverage = plan.coverage.find((row) => row.intentKey === key);
    assert.equal(coverage.status, "strong", key);
    assert.equal(coverage.bestPageManagedRoute, true, key);
  }
  assert.equal(plan.summary.commercialGapCount, 2); // agency + services are absent in this focused fixture
  assert.equal(plan.opportunities.some((row) => ["cruise", "circuit", "stay", "ticketing", "tailor-made"].includes(row.intentKey)), false);
});

test("weak managed route becomes review-only instead of Website Designer write", () => {
  const row = {
    status: "gap",
    intentKey: "cruise",
    label: "croisières",
    commercial: true,
    bestPageSlug: "croisieres",
    bestScore: 55,
    bestLocalityScore: 35,
    bestPageManagedRoute: true,
    bestPageWriteEligible: false,
    gapReason: "locality-partial",
  };
  const opportunity = opportunityForCoverage(row, { city: "Gien" });
  assert.equal(opportunity.type, "managed-route-semantic-review");
  assert.equal(opportunity.writeEligible, false);
  assert.equal(opportunity.requiresHumanReview, true);
});
