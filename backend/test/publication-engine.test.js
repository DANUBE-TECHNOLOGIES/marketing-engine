"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { auditPage, lengthRule } = require("../src/modules/publication-engine/audit");
const { createSnapshot, restoreData } = require("../src/modules/publication-engine/snapshot");
const { assertTransition, normalizeState, stateToPageData } = require("../src/modules/publication-engine/workflow");
const { hashSnapshot } = require("../src/modules/publication-engine/service");

function validPage() {
  return {
    id: "page-1", siteId: "site-1", title: "Budapest", slug: "budapest", path: "/destinations/budapest",
    pageType: "destination", menuTitle: "Budapest", menuLocation: "main", displayOrder: 1,
    seoTitle: "Voyage à Budapest : séjour et conseils avec Mondescale",
    metaDescription: "Préparez votre voyage à Budapest avec les conseils de votre agence Mondescale : périodes, budget, visites, thermes et accompagnement personnalisé.",
    h1: "Organiser votre voyage à Budapest", schemaType: "TouristDestination", status: "draft", published: false,
    parentId: null,
    sections: [
      { sectionType: "hero", jsonContent: { title: "Budapest" }, displayOrder: 1, status: "draft" },
      { sectionType: "intro", jsonContent: { text: "Découvrir Budapest" }, displayOrder: 2, status: "draft" },
      { sectionType: "contact-cta", jsonContent: { label: "Contacter l'agence" }, displayOrder: 3, status: "draft" },
    ],
  };
}

test("valide les longueurs SEO", () => {
  assert.equal(lengthRule("12345", 2, 8).ok, true);
  assert.equal(lengthRule("x", 2, 8).ok, false);
});

test("audit SEO valide une page complète", () => {
  const audit = auditPage(validPage(), { baseUrl: "https://example.test" });
  assert.equal(audit.passed, true);
  assert.ok(audit.score >= 90);
  assert.equal(audit.canonical, "https://example.test/destinations/budapest");
});

test("audit SEO bloque une page incomplète", () => {
  const audit = auditPage({ id: "x", path: "/x", sections: [] });
  assert.equal(audit.passed, false);
  assert.ok(audit.blockers.length >= 3);
});

test("snapshot conserve page et sections", () => {
  const snapshot = createSnapshot(validPage());
  assert.equal(snapshot.pageId, "page-1");
  assert.equal(snapshot.sections.length, 3);
  const restored = restoreData(snapshot);
  assert.equal(restored.page.slug, "budapest");
});

test("snapshot est indépendant de la source", () => {
  const page = validPage();
  const snapshot = createSnapshot(page);
  page.sections[0].jsonContent.title = "Modifié";
  assert.equal(snapshot.sections[0].jsonContent.title, "Budapest");
});

test("checksum stable pour un même snapshot", () => {
  const snapshot = createSnapshot(validPage());
  assert.equal(hashSnapshot(snapshot), hashSnapshot(snapshot));
  assert.match(hashSnapshot(snapshot), /^[a-f0-9]{64}$/);
});

test("workflow autorise draft vers review", () => {
  assert.deepEqual(assertTransition("draft", "review"), { from: "draft", to: "review", noop: false });
});

test("workflow refuse published vers draft sans force", () => {
  assert.throws(() => assertTransition("published", "draft"), /Transition interdite/);
  assert.equal(assertTransition("published", "draft", { force: true }).to, "draft");
});

test("workflow détecte une transition sans effet", () => {
  assert.equal(assertTransition("draft", "draft").noop, true);
});

test("normalisation et données de publication", () => {
  assert.equal(normalizeState(" REVIEW "), "review");
  const data = stateToPageData("published", new Date("2026-07-29T12:00:00Z"));
  assert.equal(data.published, true);
  assert.equal(data.publishedAt.toISOString(), "2026-07-29T12:00:00.000Z");
});
