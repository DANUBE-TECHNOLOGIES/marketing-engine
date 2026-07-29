"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { destinationPath, buildLinkItems, buildInternalLinkPlan, buildRecommendationSectionData } = require("../src/lib/miniSiteInternalLinker");

const destinations = [
  { id: "d1", slug: "budapest", name: "Budapest", country: "Hongrie", themes: [{ themeId: "city" }], travelTypes: [] },
  { id: "d2", slug: "prague", name: "Prague", country: "Tchéquie", themes: [{ themeId: "city" }], travelTypes: [] },
  { id: "d3", slug: "bali", name: "Bali", country: "Indonésie", themes: [{ themeId: "plage" }], travelTypes: [] },
];
const pages = [
  { id: "p1", slug: "budapest", pageType: "destination", path: "/budapest" },
  { id: "p2", slug: "prague", pageType: "destination", path: "/prague" },
];

test("construit une URL interne canonique", () => assert.equal(destinationPath("ozoir", "budapest"), "/agence/ozoir/destination/budapest"));
test("ne recommande que les destinations ayant une page", () => {
  const links = buildLinkItems({ destination: destinations[0], destinations, pages, siteSlug: "ozoir" });
  assert.equal(links.length, 1);
  assert.equal(links[0].title, "Prague");
});
test("audite les liens entrants, sortants et pages orphelines", () => {
  const plan = buildInternalLinkPlan({ destinations, pages, siteSlug: "ozoir" });
  assert.equal(plan.summary.pages, 2);
  assert.equal(plan.summary.links, 2);
  assert.equal(plan.summary.orphans, 0);
});
test("prépare une section compatible Prisma", () => {
  const section = buildRecommendationSectionData([{ title: "Prague", href: "/prague" }], "published");
  assert.equal(section.sectionType, "destination-recommendations");
  assert.equal(section.status, "published");
  assert.equal(section.jsonContent.items.length, 1);
});
