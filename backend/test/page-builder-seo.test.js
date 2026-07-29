"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { composePage, TEMPLATE_DEFINITIONS } = require("../src/lib/pageBuilder");
const { buildStructuredData, faqItems } = require("../src/lib/seo/structuredData");

const site = { id: "s1", name: "Mondescale Test", slug: "test", basePath: "/agence/test" };
const page = { id: "p1", title: "Japon", h1: "Voyage au Japon", path: "/agence/test/destination/japon", pageType: "destination", seoTitle: "Voyage Japon", metaDescription: "Découvrez le Japon", status: "published", published: true, sections: [
  { id: "b1", sectionType: "hero", displayOrder: 1, jsonContent: { title: "Japon", imageUrl: "/japon.jpg" } },
  { id: "b2", sectionType: "faq", displayOrder: 2, jsonContent: { items: [{ question: "Quand partir ?", answer: "Au printemps." }] } },
] };

test("destination template exposes SEO blocks", () => {
  assert.deepEqual(TEMPLATE_DEFINITIONS.destination.blocks.slice(0, 4), ["breadcrumb", "hero", "intro", "climate"]);
});

test("composePage returns metadata and JSON-LD", () => {
  const result = composePage(page, site, { baseUrl: "https://example.test" });
  assert.equal(result.version, "1.1");
  assert.equal(result.seo.metadata.title, "Voyage Japon");
  assert.equal(result.seo.metadata.openGraph.images[0], "/japon.jpg");
  assert.equal(result.seo.breadcrumbs.length, 2);
  assert.equal(result.seo.structuredData["@graph"].some((node) => node["@type"] === "FAQPage"), true);
  assert.equal(result.seo.structuredData["@graph"].some((node) => node["@type"] === "TouristDestination"), true);
});

test("FAQ schema ignores incomplete answers", () => {
  assert.equal(faqItems([{ type: "faq", content: { items: [{ question: "Q" }, { question: "Q2", answer: "A2" }] } }]).length, 1);
});

test("structured data uses absolute URLs when baseUrl is provided", () => {
  const data = buildStructuredData({ site, page, blocks: [], breadcrumbs: [{ name: "Accueil", path: site.basePath }, { name: "Japon", path: page.path }], baseUrl: "https://example.test" });
  const breadcrumb = data["@graph"].find((node) => node["@type"] === "BreadcrumbList");
  assert.equal(breadcrumb.itemListElement[1].item, "https://example.test/agence/test/destination/japon");
});
