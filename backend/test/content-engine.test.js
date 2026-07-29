"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { composeDestinationContent } = require("../src/modules/content-engine/composer");
const { createContentEngineService } = require("../src/modules/content-engine/service");

function destination() {
  return {
    id: "dest-1", slug: "budapest", name: "Budapest", status: "published",
    countryRef: { name: "Hongrie" }, regionRef: { name: "Hongrie centrale" },
    knowledge: {
      shortDescription: "Budapest associe patrimoine, thermes et art de vivre.",
      bestMonths: [4, 5, 9, 10], idealDurationDays: 4,
      currencyCode: "HUF", currencyName: "forint hongrois", languages: ["hongrois"],
      timezone: "Europe/Budapest", flightDurationMinutes: 150,
      entryRequirements: "Carte nationale d'identité ou passeport en cours de validité.",
      healthAdvice: "Aucune vaccination obligatoire.",
      highlights: ["Le Parlement", "Les thermes Széchenyi", "Le quartier du château"],
    },
    climateMonths: [{ month: 5, minTempC: 11, maxTempC: 22, rainDays: 8, sunshineHours: 8 }],
    travelProfile: { familyScore: 70, coupleScore: 90, cultureScore: 95 },
    budgetProfile: { dailyBudgetLow: 55, dailyBudgetMid: 95, dailyBudgetHigh: 180, flightBudgetLow: 120, flightBudgetHigh: 300 },
    themes: [{ theme: { name: "Culture" } }], travelTypes: [{ travelType: { name: "City break" } }], tags: [],
  };
}

test("compose une page destination enrichie", () => {
  const content = composeDestinationContent({
    destination: destination(),
    site: { slug: "ozoir", name: "Mondescale Ozoir", agency: { name: "Mondescale Ozoir", phone: "01 23 45 67 89" } },
    recommendations: [{ name: "Prague", slug: "prague", score: 82, reasons: ["culture"] }],
  });
  assert.equal(content.destination.slug, "budapest");
  assert.equal(content.seo.schemaType, "TouristDestination");
  assert.ok(content.sections.some((section) => section.type === "budget"));
  assert.ok(content.sections.some((section) => section.type === "recommendations"));
  assert.ok(content.quality.score >= 80);
  assert.match(content.contentHash, /^[a-f0-9]{64}$/);
});

test("omet les blocs sans données", () => {
  const content = composeDestinationContent({ destination: { id: "x", slug: "x", name: "X", knowledge: {}, climateMonths: [], themes: [], travelTypes: [], tags: [] } });
  assert.ok(!content.sections.some((section) => section.type === "budget"));
  assert.ok(content.quality.missingSections.includes("budget"));
});

test("rejette une destination invalide", () => {
  assert.throws(() => composeDestinationContent({ destination: { slug: "x" } }), /destination/i);
});

test("service charge destination, site et recommandations", async () => {
  const data = destination();
  const prisma = {
    destination: { findUnique: async () => data },
    agencySite: { findUnique: async () => ({ slug: "ozoir", name: "Ozoir", agency: { name: "Ozoir" } }) },
    destinationRelation: { findMany: async () => [{ score: 80, relationType: "similar", metadata: { reasons: ["culture"] }, target: { id: "p", name: "Prague", slug: "prague" } }] },
  };
  const service = createContentEngineService(prisma);
  const content = await service.preview({ slug: "budapest", siteSlug: "ozoir" });
  assert.equal(content.destination.name, "Budapest");
  assert.ok(content.sections.some((section) => section.type === "recommendations"));
});
