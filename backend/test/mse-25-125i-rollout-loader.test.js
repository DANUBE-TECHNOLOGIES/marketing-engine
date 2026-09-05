"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadRolloutAgencies } = require("../src/modules/ranking-grid/routes");

test("loadRolloutAgencies assembles simple Prisma reads without nested campaign relation", async () => {
  const calls = [];
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
    rankingKeyword: {
      findMany: async (args) => {
        calls.push(["keyword", args]);
        return [
          { id: 10, agencyId: 1, keyword: "agence de voyage", city: "Alpha", active: true },
          { id: 11, agencyId: 2, keyword: "voyage", city: "Beta", active: true },
        ];
      },
    },
    rankingGridCampaign: {
      findMany: async (args) => {
        calls.push(["campaign", args]);
        return [
          { id: 3, agencyId: 1, centerLat: 48.1, centerLng: 2.1 },
          { id: 2, agencyId: 1, centerLat: 48.0, centerLng: 2.0 },
        ];
      },
    },
  };

  const agencies = await loadRolloutAgencies(prisma, "tenant_mondescale");

  assert.equal(agencies.length, 2);
  assert.equal(agencies[0].keywords[0].id, 10);
  assert.equal(agencies[0].rankingGridCampaigns[0].id, 3);
  assert.deepEqual(agencies[1].rankingGridCampaigns, []);

  const agencySelect = calls.find(([name]) => name === "agency")[1].select;
  assert.equal(Object.prototype.hasOwnProperty.call(agencySelect, "rankingGridCampaigns"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(agencySelect, "keywords"), false);

  const campaignWhere = calls.find(([name]) => name === "campaign")[1].where;
  assert.deepEqual(campaignWhere.agencyId.in, [1, 2]);
});
