"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { parseDrift, loadGoogleListing } = require("./remediation-execution-routes");

test("remediation drift parser only accepts arrays", () => {
  assert.deepEqual(parseDrift(["phone", "website", null]), ["phone", "website"]);
  assert.deepEqual(parseDrift("phone"), []);
});

test("Google remediation creates a missing Local Engine listing when needed", async () => {
  const prisma = {
    localDirectory: { findUnique: async () => ({ id: 4, name: "Google Business Profile" }) },
    directoryListing: {
      findUnique: async () => null,
      create: async ({ data }) => ({ id: 99, ...data })
    }
  };
  const listing = await loadGoogleListing(prisma, 7);
  assert.equal(listing.id, 99);
  assert.equal(listing.agencyId, 7);
  assert.equal(listing.directoryId, 4);
  assert.equal(listing.status, "missing");
});
