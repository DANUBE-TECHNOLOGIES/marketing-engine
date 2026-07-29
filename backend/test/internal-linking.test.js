"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { overlapRatio, haversineKm, geographyScore, scoreDestinationPair } = require("../src/modules/internal-linking/scoring");
const { destinationAnchors, selectAnchor } = require("../src/modules/internal-linking/anchors");
const { destinationFromPage } = require("../src/modules/internal-linking/service");

function destination(overrides = {}) {
  return {
    id: "a", name: "Budapest", slug: "budapest", country: "Hongrie", countryId: "hu", regionId: "central",
    latitude: 47.4979, longitude: 19.0402, idealDuration: "3 jours", audiences: ["couples"], updatedAt: new Date(),
    themes: [{ themeId: "culture" }, { themeId: "city-break" }],
    travelTypes: [{ travelTypeId: "weekend" }], tags: [{ tagId: "danube" }], relationsFrom: [],
    ...overrides
  };
}

test("overlapRatio measures taxonomy similarity", () => {
  assert.equal(overlapRatio(new Set(["a", "b"]), new Set(["b", "c"])), 0.5);
});

test("haversineKm calculates a plausible Budapest-Vienna distance", () => {
  const distance = haversineKm(destination(), destination({ latitude: 48.2082, longitude: 16.3738 }));
  assert.ok(distance > 200 && distance < 260);
});

test("geographyScore rewards the same region", () => {
  assert.deepEqual(geographyScore(destination(), destination({ id: "b", regionId: "central" })), { score: 0.9, reason: "same_region" });
});

test("scoreDestinationPair rewards shared taxonomy and explicit relations", () => {
  const source = destination({ relationsFrom: [{ targetId: "b", relationType: "similar", score: 90, origin: "manual" }] });
  const target = destination({ id: "b", name: "Vienne", slug: "vienne", country: "Autriche", countryId: "at" });
  const result = scoreDestinationPair(source, target);
  assert.ok(result.score >= 70);
  assert.ok(result.reasons.includes("shared_themes"));
  assert.equal(result.relation.origin, "manual");
});

test("anchor generator creates deterministic varied anchors", () => {
  const target = destination({ id: "b", name: "Vienne", slug: "vienne", country: "Autriche", type: "city" });
  assert.ok(destinationAnchors(target).includes("week-end à Vienne"));
  assert.equal(selectAnchor(target, { sourceId: "a" }), selectAnchor(target, { sourceId: "a" }));
});

test("destinationFromPage matches a destination slug", () => {
  const matcher = destinationFromPage({ slug: "budapest", title: "Guide Budapest", h1: "Budapest" });
  assert.equal(matcher(destination()), true);
});
