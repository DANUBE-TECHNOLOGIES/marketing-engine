"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzePage } = require("../src/modules/seo-intelligence/analyzer");
const { grade } = require("../src/modules/seo-intelligence/score/calculator");

function page(overrides = {}) {
  return { id: "p1", siteId: "s1", title: "Voyage à Budapest", slug: "budapest", path: "/budapest", seoTitle: "Voyage à Budapest : guide complet et conseils", metaDescription: "Découvrez Budapest avec nos conseils pratiques, les meilleures périodes, les incontournables et les idées de séjour pour organiser votre voyage sereinement.", h1: "Voyage à Budapest", schemaType: "TouristDestination", status: "published", updatedAt: new Date("2026-07-29"), site: { slug: "agence-test" }, sections: [
    { jsonContent: { heading: "Pourquoi visiter Budapest ?", body: "Budapest séduit par son patrimoine, ses bains thermaux, ses quartiers historiques et sa gastronomie. ".repeat(12), links: [{ href: "/prague" }, { href: "/vienne" }], image: { src: "/budapest.jpg", alt: "Le Parlement de Budapest au bord du Danube" } } },
    { jsonContent: { heading: "Quand partir à Budapest ?", body: "Le printemps et l'automne offrent des températures agréables et une fréquentation plus modérée. ".repeat(8) } },
    { jsonContent: { heading: "Préparer son séjour", body: "Prévoyez plusieurs jours pour explorer Buda et Pest, les marchés, les musées et les rives du Danube. ".repeat(8), faq: [{ question: "Combien de jours ?", answer: "Trois à quatre jours." }, { question: "Quelle monnaie ?", answer: "Le forint hongrois." }] } }
  ], ...overrides };
}

test("produit un rapport SEO stable et détaillé", () => { const report = analyzePage(page()); assert.equal(report.page.id, "p1"); assert.ok(report.score >= 70); assert.equal(report.grade, grade(report.score)); assert.ok(report.checks.length >= 10); assert.equal(report.metrics.h1Count, 1); });
test("détecte une page pauvre", () => { const report = analyzePage(page({ seoTitle: "Test", metaDescription: "", h1: "", schemaType: "", sections: [] })); assert.ok(report.score < 50); assert.ok(report.recommendations.some(x => x.severity === "critical")); });
test("signale plusieurs H1", () => { const report = analyzePage(page({ sections: [{ jsonContent: { h1: "Second H1", body: "Texte" } }] })); const check = report.checks.find(x => x.id === "content.h1.single"); assert.equal(check.passed, false); assert.equal(check.details.actual, 2); });
test("calcule les métriques de liens et images", () => { const report = analyzePage(page()); assert.equal(report.metrics.internalLinks, 2); assert.equal(report.metrics.images, 1); assert.equal(report.metrics.imagesWithAlt, 1); });
test("classe correctement les notes", () => { assert.equal(grade(95), "A"); assert.equal(grade(78), "B"); assert.equal(grade(62), "C"); assert.equal(grade(45), "D"); assert.equal(grade(20), "E"); });
