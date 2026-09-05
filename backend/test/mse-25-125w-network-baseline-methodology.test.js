"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { RankingGridService, campaignKey } = require("../src/modules/ranking-grid/service");
const { prepareNetworkBaselines } = require("../src/modules/ranking-grid/network-baselines");
const { methodologyMetadata } = require("../src/modules/ranking-grid/dataforseo-provider");

function memoryRepository() {
  let nextId = 10;
  const campaigns = new Map();
  return {
    campaigns,
    async getAgencyKeyword({ agencyId, keywordId }) {
      return { id: keywordId, agencyId, keyword: "agence de voyage", city: "Test" };
    },
    async findCampaignByKey({ key }) {
      return [...campaigns.values()].find((campaign) => campaign.key === key) || null;
    },
    async createCampaignWithPoints(input) {
      const campaign = {
        ...input,
        id: nextId++,
        status: "pending",
        points: input.points.map((point, index) => ({ ...point, id: index + 1, status: "pending" })),
      };
      campaigns.set(campaign.id, campaign);
      return campaign;
    },
  };
}

const auditedAgency = {
  agencyId: 6,
  agencyName: "Ambassade FRAM - Mondescale Bois-Colombes",
  city: "Bois-Colombes",
  status: "ready",
  center: { latitude: 48.91398, longitude: 2.273679 },
  activeKeywords: [{ id: 2, keyword: "agence de voyage" }],
};

test("network baseline precheck uses calibrated methodology key rather than legacy key", async () => {
  const repository = memoryRepository();
  const methodology = methodologyMetadata();
  const service = new RankingGridService({
    repository,
    provider: { name: "dataforseo-google-maps-live", methodology },
  });

  const legacyKey = campaignKey({
    agencyId: 6,
    keywordId: 2,
    centerLat: 48.91398,
    centerLng: 2.273679,
    gridSize: 5,
    spacingKm: 1,
  });
  repository.campaigns.set(1, {
    id: 1,
    key: legacyKey,
    status: "completed",
    centerLat: 48.91398,
    centerLng: 2.273679,
    points: Array.from({ length: 25 }),
  });

  const result = await prepareNetworkBaselines({
    tenantId: "tenant_mondescale",
    agencies: [auditedAgency],
    repository,
    service,
    methodology,
  });

  assert.equal(result.summary.created, 1);
  assert.equal(result.summary.existing, 0);
  assert.equal(result.baselines[0].campaignId, 10);
  assert.notEqual(result.baselines[0].campaignId, 1);
  assert.deepEqual(result.methodology, methodology);
});

test("same calibrated network baseline preparation is idempotent", async () => {
  const repository = memoryRepository();
  const methodology = methodologyMetadata();
  const service = new RankingGridService({
    repository,
    provider: { name: "dataforseo-google-maps-live", methodology },
  });

  const first = await prepareNetworkBaselines({
    tenantId: "tenant_mondescale",
    agencies: [auditedAgency],
    repository,
    service,
    methodology,
  });
  const second = await prepareNetworkBaselines({
    tenantId: "tenant_mondescale",
    agencies: [auditedAgency],
    repository,
    service,
    methodology,
  });

  assert.equal(first.summary.created, 1);
  assert.equal(second.summary.existing, 1);
  assert.equal(first.baselines[0].campaignId, second.baselines[0].campaignId);
  assert.deepEqual(second.baselines[0].methodology, methodology);
});
