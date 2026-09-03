"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzePage } = require("../src/modules/seo-brain/analyzers");
const { SeoBrainService, grade, priority } = require("../src/modules/seo-brain/service");

function page(overrides = {}) {
  return { id: "p1", siteId: "s1", title: "Budapest", path: "/budapest", status: "draft", seoTitle: "Voyage à Budapest : guide complet 2026", metaDescription: "Découvrez Budapest, ses thermes, ses quartiers historiques et nos conseils pour organiser un séjour réussi dans la capitale hongroise.", h1: "Voyage à Budapest", schemaType: "TouristDestination", sections: [{ sectionType: "intro", jsonContent: { text: "Budapest ".repeat(550) } }, { sectionType: "highlights", jsonContent: {} }, { sectionType: "faq", jsonContent: {} }, { sectionType: "cta", jsonContent: { href: "/contact" } }], ...overrides };
}

test("analyse une page complète", () => assert.ok(analyzePage(page()).score >= 70));
test("détecte une page faible", () => assert.ok(analyzePage(page({ seoTitle: "Court", metaDescription: "", h1: "", sections: [] })).score < 40));
test("calcule les grades", () => { assert.equal(grade(95), "A"); assert.equal(grade(45), "D"); });
test("classe les priorités", () => { assert.equal(priority(14), "critical"); assert.equal(priority(8), "medium"); });
test("produit un plan page", () => { const s = new SeoBrainService({}); const r = s.buildPagePlan(page({ metaDescription: "" }), [page(), page({ id: "p2", title: "Prague", h1: "Voyage à Prague", path: "/prague" })]); assert.ok(r.actions.some(a => a.code === "meta")); assert.ok(r.estimatedPotentialScore >= r.score); });
test("produit une roadmap site", async () => { const repo = { listSites: async () => [{ id: "s1", name: "Site", slug: "site", pages: [page()] }] }; const r = await new SeoBrainService(repo).roadmap(); assert.equal(r.sites, 1); assert.ok(Number.isFinite(r.averageScore)); });
