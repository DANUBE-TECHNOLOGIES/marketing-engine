"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { jaccard, scoreDestinationPair, rankCandidates } = require("../src/modules/recommendation/scoring");

function destination(overrides = {}) {
  return {
    id: overrides.id || Math.random().toString(36),
    slug: overrides.slug || "destination",
    countryId: overrides.countryId || "country-fr",
    regionId: overrides.regionId || null,
    countryRef: overrides.countryRef || { continent: "Europe" },
    themes: overrides.themes || [{ theme: { slug: "culture" } }],
    travelTypes: overrides.travelTypes || [{ travelType: { slug: "city-break" } }],
    knowledge: overrides.knowledge || { flightDurationMin: 120, flightDurationMax: 150, bestMonths: [4,5,6,9] },
    climateMonths: overrides.climateMonths || [{ month: 6, temperatureMinC: 16, temperatureMaxC: 27, rainfallMm: 45, comfortScore: 85 }],
    travelProfile: overrides.travelProfile || { cultureScore: 90, coupleScore: 80, familyScore: 65, suitableFor: ["couple", "culture"] },
    budgetProfile: overrides.budgetProfile || { dailyBudgetMid: 120, flightBudgetMid: 300, accommodationMid: 110 },
    ...overrides,
  };
}

test("jaccard calcule correctement le chevauchement", () => {
  assert.equal(jaccard(["a", "b"], ["b", "c"]), 1 / 3);
  assert.equal(jaccard([], []), null);
});

test("une destination très proche obtient un score élevé", () => {
  const source = destination({ id: "a", slug: "budapest" });
  const candidate = destination({ id: "b", slug: "prague" });
  const result = scoreDestinationPair(source, candidate);
  assert.ok(result.score >= 85, `score reçu: ${result.score}`);
  assert.ok(result.coverage >= 80);
  assert.ok(result.reasons.length >= 3);
});

test("une destination différente obtient un score inférieur", () => {
  const source = destination({ id: "a", slug: "budapest" });
  const candidate = destination({
    id: "b", slug: "maldives", countryId: "mv", countryRef: { continent: "Asie" },
    themes: [{ theme: { slug: "plage" } }], travelTypes: [{ travelType: { slug: "sejour" } }],
    knowledge: { flightDurationMin: 650, flightDurationMax: 720, bestMonths: [1,2,3] },
    climateMonths: [{ month: 2, temperatureMinC: 26, temperatureMaxC: 31, rainfallMm: 80, comfortScore: 75 }],
    travelProfile: { cultureScore: 20, coupleScore: 95, familyScore: 50, beachScore: 100, suitableFor: ["couple", "plage"] },
    budgetProfile: { dailyBudgetMid: 450, flightBudgetMid: 1100, accommodationMid: 500 },
  });
  const close = scoreDestinationPair(source, destination({ id: "c", slug: "prague" }));
  const far = scoreDestinationPair(source, candidate);
  assert.ok(far.score < close.score, `${far.score} devrait être inférieur à ${close.score}`);
});

test("rankCandidates applique seuil, tri et limite", () => {
  const source = destination({ id: "source", slug: "budapest" });
  const candidates = [
    destination({ id: "same", slug: "prague" }),
    destination({ id: "medium", slug: "vienne", budgetProfile: { dailyBudgetMid: 210, flightBudgetMid: 500, accommodationMid: 220 } }),
    destination({ id: "source", slug: "budapest" }),
  ];
  const ranked = rankCandidates(source, candidates, { limit: 1, minScore: 10 });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].candidate.slug, "prague");
});

test("le score reste calculable avec des données partielles", () => {
  const source = destination({ id: "a", climateMonths: [], knowledge: null, budgetProfile: null });
  const candidate = destination({ id: "b", climateMonths: [], knowledge: null, budgetProfile: null });
  const result = scoreDestinationPair(source, candidate);
  assert.ok(result.score > 0);
  assert.ok(result.coverage < 100);
});
