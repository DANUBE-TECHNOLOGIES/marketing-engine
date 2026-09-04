"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { listPublishedAgencySites } = require("./routes");

test("lists only effectively published agency sites with a published page", async () => {
  let capturedQuery = null;
  const database = {
    agencySite: {
      async findMany(query) {
        capturedQuery = query;
        return [
          {
            slug: "mondescale-lamorlaye",
            name: "Mondescale Voyages Lamorlaye",
            publishedAt: new Date("2026-09-01T10:00:00Z"),
            agency: { city: "Lamorlaye" },
          },
        ];
      },
    },
  };

  const sites = await listPublishedAgencySites(database, "tenant-mondescale");

  assert.equal(capturedQuery.where.tenantId, "tenant-mondescale");
  assert.deepEqual(capturedQuery.where.OR, [
    { status: "published" },
    { publishedAt: { not: null } },
  ]);
  assert.deepEqual(capturedQuery.where.pages.some.OR, [
    { published: true },
    { status: "published" },
  ]);
  assert.deepEqual(sites, [
    {
      slug: "mondescale-lamorlaye",
      name: "Mondescale Voyages Lamorlaye",
      city: "Lamorlaye",
      publishedAt: new Date("2026-09-01T10:00:00Z"),
    },
  ]);
});

test("does not invent a city when agency city is absent", async () => {
  const database = {
    agencySite: {
      async findMany() {
        return [
          {
            slug: "remote-site",
            name: "Remote site",
            publishedAt: null,
            agency: null,
          },
        ];
      },
    },
  };

  const sites = await listPublishedAgencySites(database, "tenant-mondescale");
  assert.equal(sites[0].city, null);
});
