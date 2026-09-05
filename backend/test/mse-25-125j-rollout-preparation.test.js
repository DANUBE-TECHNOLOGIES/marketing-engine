"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const AgencyProfileService = require("../src/modules/agency-profile/service");
const {
  ROLLOUT_PREPARATION_ACK,
  DEFAULT_RANKING_KEYWORD,
  agenciesMissingActiveKeyword,
  ensureMissingRankingKeywords,
  syncMissingGoogleCoordinates,
} = require("../src/modules/ranking-grid/rollout-preparation");

test("Google Business profile sync requests latlng and persists returned coordinates", async () => {
  const originalFetch = global.fetch;
  let requestedUrl = null;
  let persisted = null;

  global.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        name: "locations/123",
        title: "Agency",
        latlng: { latitude: 48.1, longitude: 2.2 },
      }),
    };
  };

  const prisma = {
    googleToken: {
      findFirst: async () => ({
        id: 1,
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiryDate: BigInt(Date.now() + 3600_000),
      }),
    },
  };
  const repository = {
    findAgency: async () => ({ id: 3, googleLocationId: "locations/123" }),
    upsert: async (agencyId, data) => {
      persisted = { agencyId, data };
      return data;
    },
  };

  try {
    const service = new AgencyProfileService(prisma, repository);
    await service.syncGoogleHours(3);
  } finally {
    global.fetch = originalFetch;
  }

  const url = new URL(requestedUrl);
  const readMask = url.searchParams.get("readMask").split(",");
  assert.equal(readMask.includes("latlng"), true);
  assert.deepEqual(persisted.data.googleLocationData.latlng, {
    latitude: 48.1,
    longitude: 2.2,
  });
});

test("missing keyword preparation targets only agencies without an active keyword", async () => {
  const agencies = [
    { id: 1, city: "Maurepas", keywords: [{ id: 1, active: true }] },
    { id: 3, city: "Dax", keywords: [] },
    { id: 4, city: "Gien", keywords: [] },
  ];

  assert.deepEqual(
    agenciesMissingActiveKeyword(agencies).map((agency) => agency.id),
    [3, 4],
  );
  assert.equal(DEFAULT_RANKING_KEYWORD, "agence de voyage");
  assert.equal(ROLLOUT_PREPARATION_ACK, "PREPARE-NETWORK-ROLLOUT");

  let rawCalls = 0;
  const inserted = await ensureMissingRankingKeywords({
    $queryRaw: async () => {
      rawCalls += 1;
      return [
        { id: 20, agencyId: 3, keyword: DEFAULT_RANKING_KEYWORD, city: "Dax", active: true },
        { id: 21, agencyId: 4, keyword: DEFAULT_RANKING_KEYWORD, city: "Gien", active: true },
      ];
    },
  }, "tenant_mondescale", agencies);

  assert.equal(rawCalls, 1);
  assert.equal(inserted.length, 2);
});

test("missing Google coordinate sync is limited to coordinate blockers and keeps per-agency errors", async () => {
  const agencies = [
    { id: 6, city: "Bois-Colombes", googleLocationId: "locations/6" },
    { id: 3, city: "Dax", googleLocationId: "locations/3" },
    { id: 4, city: "Gien", googleLocationId: "locations/4" },
  ];
  const auditById = new Map([
    [6, { blockers: [] }],
    [3, { blockers: ["coordinates"] }],
    [4, { blockers: ["coordinates"] }],
  ]);
  const calls = [];

  const results = await syncMissingGoogleCoordinates({
    agencies,
    auditAgency: (agency) => auditById.get(agency.id),
    syncGoogleProfile: async (agencyId) => {
      calls.push(agencyId);
      if (agencyId === 4) {
        const error = new Error("temporary Google failure");
        error.code = "GOOGLE_BUSINESS_SYNC_FAILED";
        throw error;
      }
      return {
        googleLocationData: {
          latlng: { latitude: 43.7, longitude: -1.05 },
        },
      };
    },
  });

  assert.deepEqual(calls, [3, 4]);
  assert.equal(results[0].status, "synced");
  assert.equal(results[0].hasLatLng, true);
  assert.equal(results[1].status, "error");
  assert.equal(results[1].code, "GOOGLE_BUSINESS_SYNC_FAILED");
});
