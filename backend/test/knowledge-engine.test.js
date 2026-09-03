"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeText, textScore, recommendationScore, deduplicateRanked } = require("../src/lib/knowledgeEngine");

test("normalizeText removes accents and punctuation", () => assert.equal(normalizeText("États-Unis d’Amérique"), "etats unis d amerique"));
test("textScore tolerates a small typo", () => assert.ok(textScore("japom", "Japon") >= 60));
test("deduplicateRanked keeps strongest entity", () => {
  const rows = deduplicateRanked([{ entityType: "country", id: "1", name: "Japon", score: 70 }, { entityType: "country", id: "1", name: "Japan", score: 95 }]);
  assert.equal(rows.length, 1); assert.equal(rows[0].score, 95);
});
test("recommendationScore rewards shared geography and taxonomy", () => {
  const score = recommendationScore({ countryId: "fr", regionId: "idf", themes: [{ themeId: "culture" }], travelTypes: [{ travelTypeId: "circuit" }] }, { countryId: "fr", regionId: "idf", themes: [{ themeId: "culture" }], travelTypes: [{ travelTypeId: "circuit" }] });
  assert.equal(score.score, 80); assert.ok(score.reasons.includes("same_country"));
});
