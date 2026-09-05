"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  auditAgencyIdentity,
  summarizeIdentityAudit,
} = require("../src/modules/ranking-grid/identity-audit");

const helpers = {
  profileIdentity(profile) {
    const data = profile?.googleLocationData || {};
    return {
      placeId: data.placeId || data.place_id || null,
      cid: data.cid || null,
    };
  },
  placeIdFromGoogleReviewUrl(value) {
    const match = String(value || "").match(/[?&]placeid=([^&#]+)/i);
    return match?.[1] || null;
  },
};

test("identity audit marks exact profile placeId as ready", () => {
  const row = auditAgencyIdentity({
    id: 1,
    name: "Agency",
    city: "Paris",
    googleLocationId: "locations/123",
    googleReviewUrl: "https://example.test/review?placeid=review-id",
    profile: { googleLocationData: { placeId: "profile-id" } },
  }, helpers);

  assert.equal(row.status, "ready");
  assert.equal(row.source, "profile_place_id");
  assert.equal(row.resolvedPlaceId, "profile-id");
  assert.equal(row.providerMatchMode, "exact_place_id");
});

test("identity audit accepts review URL placeId as ready", () => {
  const row = auditAgencyIdentity({
    id: 6,
    name: "Ambassade FRAM - Mondescale Bois-Colombes",
    city: "Bois-Colombes",
    googleLocationId: "locations/4257347512580641383",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJexpected",
    profile: { googleLocationData: {} },
  }, helpers);

  assert.equal(row.status, "ready");
  assert.equal(row.source, "review_url_place_id");
  assert.equal(row.resolvedPlaceId, "ChIJexpected");
  assert.equal(row.providerMatchMode, "exact_place_id");
});

test("identity audit classifies mapped Google location without exact identity as fallback", () => {
  const row = auditAgencyIdentity({
    id: 2,
    name: "Agency",
    city: "Gien",
    googleLocationId: "locations/456",
    googleReviewUrl: null,
    profile: { googleLocationData: {} },
  }, helpers);

  assert.equal(row.status, "fallback");
  assert.equal(row.source, "google_location_id");
  assert.equal(row.resolvedPlaceId, null);
  assert.equal(row.providerMatchMode, "textual_fallback");
});

test("identity audit classifies absent Google identity as missing", () => {
  const row = auditAgencyIdentity({
    id: 3,
    name: "Agency",
    city: "Dax",
    googleLocationId: null,
    googleReviewUrl: null,
    profile: null,
  }, helpers);

  assert.equal(row.status, "missing");
  assert.equal(row.source, null);
  assert.equal(row.providerMatchMode, "textual_fallback");
});

test("identity audit summary counts readiness states", () => {
  assert.deepEqual(summarizeIdentityAudit([
    { status: "ready" },
    { status: "ready" },
    { status: "fallback" },
    { status: "missing" },
  ]), {
    total: 4,
    ready: 2,
    fallback: 1,
    missing: 1,
  });
});
