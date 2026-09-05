"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_GRID_SIZE,
  DEFAULT_SPACING_KM,
  prepareNetworkBaselines,
} = require("../src/modules/ranking-grid/network-baselines");

test("network baseline preparation creates only missing ready agency-keyword campaigns", async () => {
  const agencies = [
    {
      agencyId: 6,
      agencyName: "Bois-Colombes",
      city: "Bois-Colombes",
      status: "ready",
      center: { latitude: 48.91398, longitude: 2.273679 },
      activeKeywords: [{ id: 2, keyword: "agence de voyage", city: "Bois-Colombes" }],
    },
    {
      agencyId: 3,
      agencyName: "Dax",
      city: "Dax",
      status: "ready",
      center: { latitude: 43.710615, longitude: -1.056581 },
      activeKeywords: [{ id: 7, keyword: "agence de voyage", city: "Dax" }],
    },
    {
      agencyId: 99,
      agencyName: "Blocked",
      city: "Blocked",
      status: "blocked",
      center: null,
      activeKeywords: [],
    },
  ];

  const createdInputs = [];
  const repository = {
    findCampaignByKey: async ({ key }) => {
      if (key.startsWith("6:2:")) {
        return {
          id: 1,
          status: "completed",
          centerLat: 48.91398,
          centerLng: 2.273679,
          points: Array.from({ length: 25 }),
        };
      }
      return null;
    },
  };
  const service = {
    createCampaign: async (input) => {
      createdInputs.push(input);
      return {
        id: 10,
        status: "pending",
        centerLat: input.centerLat,
        centerLng: input.centerLng,
        points: Array.from({ length: 25 }),
      };
    },
  };

  const result = await prepareNetworkBaselines({
    tenantId: "tenant_mondescale",
    agencies,
    repository,
    service,
  });

  assert.equal(DEFAULT_GRID_SIZE, 5);
  assert.equal(DEFAULT_SPACING_KM, 1);
  assert.equal(result.summary.created, 1);
  assert.equal(result.summary.existing, 1);
  assert.equal(result.summary.skipped, 1);
  assert.equal(createdInputs.length, 1);
  assert.equal(createdInputs[0].agencyId, 3);
  assert.equal(createdInputs[0].keywordId, 7);
  assert.equal(createdInputs[0].gridSize, 5);
  assert.equal(createdInputs[0].spacingKm, 1);
  assert.equal(result.baselines.find((row) => row.agencyId === 3).points, 25);
  assert.equal(result.baselines.find((row) => row.agencyId === 3).campaignStatus, "pending");
});

test("network baseline preparation is idempotent when all geometry keys already exist", async () => {
  const agencies = [{
    agencyId: 3,
    agencyName: "Dax",
    city: "Dax",
    status: "ready",
    center: { latitude: 43.710615, longitude: -1.056581 },
    activeKeywords: [{ id: 7, keyword: "agence de voyage", city: "Dax" }],
  }];

  let creates = 0;
  const result = await prepareNetworkBaselines({
    tenantId: "tenant_mondescale",
    agencies,
    repository: {
      findCampaignByKey: async () => ({
        id: 10,
        status: "pending",
        centerLat: 43.710615,
        centerLng: -1.056581,
        points: Array.from({ length: 25 }),
      }),
    },
    service: {
      createCampaign: async () => {
        creates += 1;
      },
    },
  });

  assert.equal(creates, 0);
  assert.equal(result.summary.created, 0);
  assert.equal(result.summary.existing, 1);
});
