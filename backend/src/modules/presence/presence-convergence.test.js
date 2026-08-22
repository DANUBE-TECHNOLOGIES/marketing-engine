"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  providerKeyForDirectory,
  enrichDirectoryWithProvider,
  legacySubmissionModeForProvider
} = require("./directory-bridge");
const { getPresenceProvider } = require("./provider-registry");
const { projectGooglePresence } = require("./google-listing-adapter");

test("legacy directory names resolve to presence providers", () => {
  assert.equal(providerKeyForDirectory({ name: "Google Business Profile" }), "google_business_profile");
  assert.equal(providerKeyForDirectory({ name: "PagesJaunes" }), "pagesjaunes");
  assert.equal(providerKeyForDirectory({ name: "Unknown" }), null);
});

test("legacy directories inherit provider capabilities without database changes", () => {
  const directory = enrichDirectoryWithProvider({ id: 1, name: "Apple Business Connect" });
  assert.equal(directory.providerKey, "apple_business_connect");
  assert.equal(directory.providerType, "managed_api");
  assert.equal(directory.managed, true);
  assert.equal(directory.requiresApproval, true);
  assert.ok(directory.capabilities.includes("push"));
});

test("legacy submission mode is derived from provider capability", () => {
  assert.equal(legacySubmissionModeForProvider(getPresenceProvider("google_business_profile")), "api");
  assert.equal(legacySubmissionModeForProvider(getPresenceProvider("tomtom")), "submission_api");
  assert.equal(legacySubmissionModeForProvider(getPresenceProvider("pagesjaunes")), "manual");
});

test("Google projection preserves existing googleLocationId as connection evidence", () => {
  const projection = projectGooglePresence({
    id: 7,
    name: "Mondescale Nevers",
    address: "1 rue Exemple",
    postalCode: "58000",
    city: "Nevers",
    phone: "03 86 00 00 00",
    website: "https://agences.mondescale.com/nevers",
    googleLocationId: "locations/123"
  });
  assert.equal(projection.connected, true);
  assert.equal(projection.externalId, "locations/123");
  assert.equal(projection.status, "in_sync");
  assert.equal(projection.diff.score, 100);
});

test("Google projection requires connection when no location id exists", () => {
  const projection = projectGooglePresence({ id: 8, name: "Mondescale Test" });
  assert.equal(projection.connected, false);
  assert.equal(projection.status, "connection_required");
  assert.equal(projection.diff, null);
});