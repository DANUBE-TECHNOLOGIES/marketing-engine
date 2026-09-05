"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  RankingGridService,
  methodologyKey,
  campaignKey,
  snapshotKey,
} = require("../src/modules/ranking-grid/service");

const method14 = {
  version: "mse-25.125u-z14-v1",
  zoom: 14,
  depth: 100,
  searchPlaces: false,
  searchThisArea: true,
};

const method15 = { ...method14, version: "legacy-z15", zoom: 15 };

function memoryRepository() {
  let nextCampaignId = 1;
  const campaigns = new Map();
  return {
    campaigns,
    async getAgencyKeyword() {
      return { id: 2, agencyId: 6, keyword: "agence de voyage", city: "Bois-Colombes" };
    },
    async findCampaignByKey({ key }) {
      return [...campaigns.values()].find((campaign) => campaign.key === key) || null;
    },
    async createCampaignWithPoints(input) {
      const campaign = {
        ...input,
        id: nextCampaignId++,
        status: "pending",
        points: input.points.map((point, index) => ({
          ...point,
          id: index + 1,
          status: "pending",
          found: false,
        })),
      };
      campaigns.set(campaign.id, campaign);
      return campaign;
    },
    async getCampaign({ campaignId }) {
      return campaigns.get(Number(campaignId)) || null;
    },
  };
}

const base = {
  tenantId: "tenant_mondescale",
  agencyId: 6,
  keywordId: 2,
  centerLat: 48.91398,
  centerLng: 2.273679,
  gridSize: 5,
  spacingKm: 1,
};

test("methodology key is stable and explicit", () => {
  assert.equal(
    methodologyKey(method14),
    "mse-25.125u-z14-v1:z14:d100:sp0:sta1",
  );
});

test("legacy campaign key remains unchanged when methodology is absent", () => {
  assert.equal(
    campaignKey(base),
    "6:2:48.9139800:2.2736790:5:1.000",
  );
});

test("calibrated campaign key differs from legacy and alternate zoom", () => {
  const legacy = campaignKey(base);
  const z14 = campaignKey({ ...base, methodology: method14 });
  const z15 = campaignKey({ ...base, methodology: method15 });
  assert.notEqual(z14, legacy);
  assert.notEqual(z14, z15);
  assert.match(z14, /method:mse-25\.125u-z14-v1:z14:d100:sp0:sta1$/);
});

test("same calibrated methodology remains idempotent", async () => {
  const repository = memoryRepository();
  const provider = { name: "mock", methodology: method14 };
  const service = new RankingGridService({ repository, provider });
  const first = await service.createCampaign(base);
  const second = await service.createCampaign(base);
  assert.equal(first.id, second.id);
  assert.equal(repository.campaigns.size, 1);
});

test("same geometry with different methodologies creates distinct campaigns", async () => {
  const repository = memoryRepository();
  const service14 = new RankingGridService({ repository, provider: { name: "mock", methodology: method14 } });
  const service15 = new RankingGridService({ repository, provider: { name: "mock", methodology: method15 } });
  const z14 = await service14.createCampaign(base);
  const z15 = await service15.createCampaign(base);
  assert.notEqual(z14.id, z15.id);
  assert.notEqual(z14.key, z15.key);
  assert.equal(repository.campaigns.size, 2);
});

test("snapshot idempotence also includes current provider methodology", () => {
  const campaign = {
    agencyId: 6,
    keywordId: 2,
    centerLat: 48.91398,
    centerLng: 2.273679,
    gridSize: 5,
    spacingKm: 1,
  };
  const z14 = snapshotKey(campaign, "2026-09-05", method14);
  const z15 = snapshotKey(campaign, "2026-09-05", method15);
  assert.notEqual(z14, z15);
  assert.match(z14, /method:mse-25\.125u-z14-v1:z14:d100:sp0:sta1:snapshot:2026-09-05$/);
});
