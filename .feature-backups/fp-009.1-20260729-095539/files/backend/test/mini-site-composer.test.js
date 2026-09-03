"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRecommendations, composeDestinationPage, composeDestinationSections } = require("../src/lib/miniSiteComposer");

const site = { id: "site-1", name: "Mondescale Melun", slug: "melun", agency: { name: "Mondescale Melun", phone: "01 02 03 04 05" } };
const destination = {
  id: "d1", name: "Japon", slug: "japon", country: "Japon", status: "published", tagline: "Voyage au Japon", summary: "Temples, gastronomie et villes fascinantes.",
  highlights: ["Tokyo", "Kyoto"], bestTime: "Mars à mai", idealDuration: "12 jours",
  themes: [{ themeId: "t1", theme: { id: "t1", name: "Culture", description: "Patrimoine et traditions" } }],
  travelTypes: [{ travelTypeId: "v1", travelType: { id: "v1", name: "Circuit", description: "Itinéraires accompagnés" } }],
  sections: [{ key: "climate", type: "climate", content: { text: "Quatre saisons marquées." } }],
  faqs: [{ question: "Quand partir ?", answer: "Au printemps ou en automne." }], relationsFrom: [],
};

test("compose une page destination SEO complète", () => {
  const page = composeDestinationPage({ destination, site, agency: site.agency, candidates: [] });
  assert.equal(page.slug, "japon");
  assert.equal(page.schemaType, "TouristDestination");
  assert.equal(page.path, "/agence/melun/destination/japon");
  assert.ok(page.sections.length >= 8);
  assert.deepEqual(page.sections.map((section) => section.displayOrder), page.sections.map((_, index) => index));
});

test("masque les blocs éditoriaux vides", () => {
  const sparse = { ...destination, highlights: [], themes: [], travelTypes: [], faqs: [] };
  const types = composeDestinationSections({ destination: sparse, site, candidates: [] }).map((section) => section.sectionType);
  assert.equal(types.includes("highlights"), false);
  assert.equal(types.includes("cards"), false);
  assert.equal(types.includes("faq"), false);
});

test("classe les recommandations par connaissance partagée", () => {
  const candidates = [
    { id: "d2", slug: "coree", name: "Corée du Sud", countryId: "c2", themes: [{ themeId: "t1" }], travelTypes: [{ travelTypeId: "v1" }] },
    { id: "d3", slug: "canada", name: "Canada", countryId: "c3", themes: [], travelTypes: [] },
  ];
  const results = buildRecommendations({ ...destination, countryId: "c1" }, candidates, 6);
  assert.equal(results[0].slug, "coree");
  assert.ok(results[0].score >= 20);
});

test("génère les appels à l'action de l'agence", () => {
  const page = composeDestinationPage({ destination, site, agency: site.agency });
  const cta = page.sections.find((section) => section.sectionType === "contact-cta");
  assert.equal(cta.jsonContent.actions.some((action) => action.href.startsWith("tel:")), true);
});
