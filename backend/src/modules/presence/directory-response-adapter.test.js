"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  providerMetadata,
  adaptPriorityWorklistRow
} = require("./directory-response-adapter");

test("Google legacy response is exposed as managed API", () => {
  const metadata = providerMetadata("Google Business Profile", "api");
  assert.equal(metadata.providerKey, "google_business_profile");
  assert.equal(metadata.providerType, "managed_api");
  assert.equal(metadata.submissionMode, "api");
  assert.ok(metadata.capabilities.includes("push"));
});

test("Apple legacy manual mode is upgraded from provider capabilities", () => {
  const metadata = providerMetadata("Apple Business Connect", "manual");
  assert.equal(metadata.providerKey, "apple_business_connect");
  assert.equal(metadata.submissionMode, "api");
  assert.equal(metadata.requiresApproval, true);
});

test("TomTom is exposed as submission API", () => {
  const metadata = providerMetadata("TomTom", "manual");
  assert.equal(metadata.providerKey, "tomtom");
  assert.equal(metadata.submissionMode, "submission_api");
});

test("unknown legacy directory keeps stored submission mode", () => {
  const metadata = providerMetadata("OpenStreetMap", "manual");
  assert.equal(metadata.providerKey, null);
  assert.equal(metadata.submissionMode, "manual");
});

test("priority worklist adaptation preserves row while overriding derived mode", () => {
  const row = adaptPriorityWorklistRow({
    id: 42,
    directoryName: "Apple Business Connect",
    submissionMode: "manual",
    priority: 85
  });
  assert.equal(row.id, 42);
  assert.equal(row.priority, 85);
  assert.equal(row.submissionMode, "api");
  assert.equal(row.presence.providerKey, "apple_business_connect");
});