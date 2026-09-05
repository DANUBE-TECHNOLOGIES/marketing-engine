"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadRolloutAgencies } = require("../src/modules/ranking-grid/routes");

test("loadRolloutAgencies assembles rollout prerequisites from agency plus raw reads", async () => {
  const calls = [];
  let rawCall = 0;
  const prisma = {
    agency: {
      findMany: async (args) => {
        calls.push(["agency", args]);
        return [
          { id: 1, name: "A", city: "Alpha", googleReviewUrl: null, googleLocationId: "locations/1", profile: { googleLocationData: {} } },
          { id: 2, name: "B", city: "Beta", googleReviewUrl: null, googleLocationId: "locations/2", profile: { googleLocationData: {} } },
        ];
      },
    },
    $queryRaw: async () => {
      rawCall += 1;
      if (rawCall === 1) {
        return [
          { id: 10, agencyId: 1, keyword: "agence de voyage", city: "Alpha", active: true },
          { id: 11, agencyId: 2, keyword: "voyage", city: "Beta", active: true },
        ];
      }
      return [
        { id: 3, agencyId: 1, centerLat: 48.1, centerLng: 2.1 },
        { id: 2, agencyId: 1, centerLat: 48.0, centerLng: 2.0 },
      ];
    },
  };

  const agencies = await loadRolloutAgencies(prisma, "tenant_mondescale");

  assert.equal(rawCall, 2);
  assert.equal(agencies.length, 2);
  assert.equal(agencies[0].keywords[0].id, 10);
  assert.equal(agencies[0].rankingGridCampaigns[0].id, 3);
  assert.deepEqual(agencies[1].rankingGridCampaigns, []);

  const agencySelect = calls.find(([name]) => name === "agency")[1].select;
  assert.equal(Object.prototype.hasOwnProperty.call(agencySelect, "rankingGridCampaigns"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(agencySelect, "keywords"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(prisma, "rankingGridCampaign"), false);
});

test("loadRolloutAgencies fails explicitly when required Prisma capability is unavailable", async () => {
  await assert.rejects(
    () => loadRolloutAgencies({ agency: { findMany: async () => [] } }, "tenant"),
    (error) => error?.code === "RANKING_GRID_ROLLOUT_PRISMA_UNAVAILABLE",
  );
});
