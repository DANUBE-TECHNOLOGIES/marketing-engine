"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  coordinatesFromGoogleLocationData,
  auditAgencyRollout,
  summarizeRolloutReadiness,
} = require("../src/modules/ranking-grid/rollout-readiness");

test("coordinatesFromGoogleLocationData supports GBP latLng variants", () => {
  assert.deepEqual(
    coordinatesFromGoogleLocationData({ latlng: { latitude: 48.9, longitude: 2.27 } }),
    { latitude: 48.9, longitude: 2.27 },
  );
  assert.deepEqual(
    coordinatesFromGoogleLocationData({ geometry: { location: { lat: 47.1, lng: 2.1 } } }),
    { latitude: 47.1, longitude: 2.1 },
  );
  assert.equal(
    coordinatesFromGoogleLocationData({ latlng: { latitude: 999, longitude: 2 } }),
    null,
  );
});

test("rollout readiness prefers persisted grid campaign coordinates", () => {
  const result = auditAgencyRollout({
    id: 6,
    name: "Bois-Colombes",
    city: "Bois-Colombes",
    profile: { googleLocationData: { latlng: { latitude: 1, longitude: 2 } } },
    rankingGridCampaigns: [{ id: 1, centerLat: 48.91398, centerLng: 2.273679 }],
    keywords: [{ id: 2, keyword: "agence de voyage", city: "Bois-Colombes", active: true }],
  }, {
    status: "ready",
    source: "review_url_place_id",
    providerMatchMode: "exact_place_id",
    resolvedPlaceId: "ChIJx",
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.center, {
    latitude: 48.91398,
    longitude: 2.273679,
    source: "ranking_grid_campaign",
    campaignId: 1,
  });
  assert.equal(result.activeKeywords[0].id, 2);
});

test("rollout readiness blocks agencies missing coordinates or keyword", () => {
  const identity = {
    status: "ready",
    source: "review_url_place_id",
    providerMatchMode: "exact_place_id",
    resolvedPlaceId: "ChIJx",
  };

  const noCoordinates = auditAgencyRollout({
    id: 1,
    name: "Agency",
    city: "City",
    profile: { googleLocationData: {} },
    rankingGridCampaigns: [],
    keywords: [{ id: 1, keyword: "agence de voyage", city: "City", active: true }],
  }, identity);
  assert.equal(noCoordinates.status, "blocked");
  assert.deepEqual(noCoordinates.blockers, ["coordinates"]);

  const noKeyword = auditAgencyRollout({
    id: 2,
    name: "Agency 2",
    city: "City 2",
    profile: { googleLocationData: { latLng: { latitude: 48, longitude: 2 } } },
    rankingGridCampaigns: [],
    keywords: [],
  }, identity);
  assert.equal(noKeyword.status, "blocked");
  assert.deepEqual(noKeyword.blockers, ["keyword"]);
  assert.equal(noKeyword.center.source, "google_location_data");
});

test("rollout readiness summary counts blocker types", () => {
  const summary = summarizeRolloutReadiness([
    { status: "ready", blockers: [] },
    { status: "blocked", blockers: ["coordinates"] },
    { status: "blocked", blockers: ["identity", "keyword"] },
  ]);
  assert.deepEqual(summary, {
    total: 3,
    ready: 1,
    blocked: 2,
    missingIdentity: 1,
    missingCoordinates: 1,
    missingKeyword: 1,
  });
});
