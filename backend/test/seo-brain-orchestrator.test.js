"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreSiteSignals } = require("../src/modules/seo-brain/scorer");
const { findDestinationOpportunities, seasonalBoost } = require("../src/modules/seo-brain/opportunities");
const { buildRecommendations } = require("../src/modules/seo-brain/recommendations");
const { buildExecutionPlan } = require("../src/modules/seo-brain/planner");
const { SeoBrainService } = require("../src/modules/seo-brain/service");

function page(overrides = {}) {
  return { id: "p1", siteId: "s1", title: "Budapest", slug: "budapest", path: "/budapest", status: "published", published: true, seoTitle: "Voyage à Budapest : guide complet 2026", metaDescription: "Découvrez Budapest, ses thermes, ses quartiers historiques et nos conseils pour organiser un séjour réussi dans la capitale hongroise.", h1: "Voyage à Budapest", schemaType: "TouristDestination", updatedAt: new Date(), sections: [{ sectionType: "intro", jsonContent: { text: "Budapest ".repeat(550) } }, { sectionType: "highlights", jsonContent: {} }, { sectionType: "faq", jsonContent: {} }, { sectionType: "cta", jsonContent: { href: "/contact", links: ["/prague", "/vienne"] } }], ...overrides };
}

test("calcule les dimensions du score site", () => {
  const result = scoreSiteSignals({ pages: [page()], pagePlans: [{ score: 90, metrics: { links: 3 } }], campaigns: [{ status: "scheduled" }], destinations: [{ slug: "budapest" }] });
  assert.ok(result.global >= 70);
  assert.equal(result.dimensions.publicationReadiness, 100);
});

test("détecte les destinations absentes du mini-site", () => {
  const result = findDestinationOpportunities({ site: { pages: [page()] }, destinations: [{ id: "d1", name: "Crète", slug: "crete", status: "published", highlights: ["a", "b", "c"] }], campaigns: [] });
  assert.equal(result.length, 1);
  assert.equal(result[0].destinationSlug, "crete");
});

test("ne recommande pas une destination déjà couverte", () => {
  const result = findDestinationOpportunities({ site: { pages: [page()] }, destinations: [{ id: "d1", name: "Budapest", slug: "budapest", status: "published" }], campaigns: [] });
  assert.equal(result.length, 0);
});

test("applique un bonus saisonnier", () => {
  assert.equal(seasonalBoost({ name: "Laponie" }, 0), 20);
  assert.equal(seasonalBoost({ name: "Crète" }, 6), 20);
});

test("ajoute une recommandation de calendrier vide", () => {
  const result = buildRecommendations({ siteReport: { priorities: [] }, opportunities: [], campaigns: [] });
  assert.ok(result.some((r) => r.type === "editorial_calendar"));
});

test("construit un plan d'exécution borné", () => {
  const plan = buildExecutionPlan([{ id: "1", type: "x", title: "X", priority: "high", autoExecutable: true }, { id: "2", type: "y", title: "Y", priority: "low", autoExecutable: false }], { maxActions: 1 });
  assert.equal(plan.actions.length, 1);
  assert.equal(plan.summary.automatic, 1);
});

test("produit un plan agence orchestré", async () => {
  const repo = {
    findSite: async () => ({ id: "s1", name: "Agence test", slug: "agence-test", status: "published", agency: { id: 1, name: "Agence", city: "Nevers" }, pages: [page()] }),
    listCampaigns: async () => [],
    listDestinations: async () => [{ id: "d2", name: "Crète", slug: "crete", status: "published", highlights: ["a", "b", "c"] }]
  };
  const result = await new SeoBrainService(repo).agencyPlan("s1", { maxActions: 10 });
  assert.equal(result.site.id, "s1");
  assert.ok(result.recommendations.length >= 1);
  assert.ok(result.executionPlan.actions.length >= 1);
  assert.ok(Number.isFinite(result.score));
});
