"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { setRuntimeListingState, listSubmittedGoogleRuntimeListings } = require("./runtime-listing-state");

test("runtime listing state uses raw SQL instead of unknown Prisma model fields", async () => {
  const calls = [];
  const prisma = {
    $executeRaw: async (strings, ...values) => {
      calls.push({ strings, values });
      return 1;
    }
  };
  const now = new Date("2026-08-24T09:00:00Z");
  const result = await setRuntimeListingState(prisma, 42, {
    automationStatus: "submitted",
    submittedAt: now,
    submissionPayload: { drift: ["phone"] }
  });
  assert.equal(result.listingId, 42);
  assert.equal(result.automationStatus, "submitted");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].values.includes(42));
});

test("submitted listing lookup is isolated in raw SQL", async () => {
  const prisma = {
    $queryRaw: async (strings, ...values) => [{ id: 7, directoryId: values[0], automationStatus: "submitted" }]
  };
  const rows = await listSubmittedGoogleRuntimeListings(prisma, 3);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].directoryId, 3);
});
