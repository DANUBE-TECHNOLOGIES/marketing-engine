"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGenerationPlan, composeHubPage, slug } = require("../src/lib/siteGenerator");
const { buildNavigation } = require("../src/lib/siteNavigationBuilder");
const { buildSitemap, buildRobots } = require("../src/lib/sitemapBuilder");

const site = { id: "s1", slug: "ozoir", name: "Mondescale Ozoir", basePath: "/agence/ozoir", agency: { name: "Mondescale Ozoir" } };
const destination = { id: "d1", name: "Budapest", slug: "budapest", country: "Hongrie", region: "Hongrie centrale", status: "published", summary: "La perle du Danube.", highlights: [], themes: [{ theme: { id: "t1", name: "City break", slug: "city-break" } }], travelTypes: [], sections: [], faqs: [], relationsFrom: [] };

test("normalise les slugs", () => assert.equal(slug("Îles & Croisières"), "iles-croisieres"));

test("compose le plan complet d'un mini-site", () => {
  const plan = buildGenerationPlan({ site, destinations: [destination], publish: true });
  assert.equal(plan.summary.destinations, 1);
  assert.ok(plan.pages.some((page) => page.pageType === "home"));
  assert.ok(plan.pages.some((page) => page.pageType === "country"));
  assert.ok(plan.pages.some((page) => page.pageType === "region"));
  assert.ok(plan.pages.some((page) => page.pageType === "theme"));
  assert.ok(plan.pages.some((page) => page.pageType === "destination"));
  assert.equal(new Set(plan.pages.map((page) => page.path)).size, plan.pages.length);
});

test("compose une page hub persistable", () => {
  const page = composeHubPage({ site, type: "country", name: "Hongrie", slug: "pays/hongrie", status: "draft" });
  assert.equal(page.path, "/agence/ozoir/pays/hongrie");
  assert.ok(page.sections.length >= 4);
});

test("construit navigation et sitemap", () => {
  const pages = [
    { id: "p1", title: "Accueil", menuTitle: "Accueil", path: "/agence/ozoir", pageType: "home", menuLocation: "main", displayOrder: 0, status: "published", published: true, updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "p2", title: "Budapest", menuTitle: "Budapest", path: "/agence/ozoir/destination/budapest", pageType: "destination", menuLocation: "destinations", displayOrder: 100, status: "published", published: true, updatedAt: "2026-01-01T00:00:00.000Z" },
  ];
  const navigation = buildNavigation({ site, pages });
  const sitemap = buildSitemap({ site, pages, baseUrl: "https://example.com" });
  assert.equal(navigation.count, 2);
  assert.equal(sitemap.count, 2);
  assert.match(sitemap.xml, /destination\/budapest/);
  assert.match(buildRobots({ baseUrl: "https://example.com", siteSlug: "ozoir" }), /sitemap\.xml/);
});
