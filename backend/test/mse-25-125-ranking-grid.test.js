"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { generateGrid } = require("../src/modules/ranking-grid/grid");
const { summarizePoints } = require("../src/modules/ranking-grid/aggregate");
const { RankingGridService, campaignKey } = require("../src/modules/ranking-grid/service");

function memoryRepository() {
  let nextCampaignId = 1;
  let nextPointId = 1;
  const campaigns = new Map();
  return {
    campaigns,
    async getAgencyKeyword() {
      return { id: 7, agencyId: 2, keyword: "agence de voyage", city: "Bois-Colombes" };
    },
    async findCampaignByKey({ key }) {
      return [...campaigns.values()].find((campaign) => campaign.key === key) || null;
    },
    async createCampaignWithPoints(input) {
      const campaign = {
        ...input,
        id: nextCampaignId++,
        status: "pending",
        points: input.points.map((point) => ({ ...point, id: nextPointId++, status: "pending", found: false })),
      };
      campaigns.set(campaign.id, campaign);
      return campaign;
    },
    async getCampaign({ campaignId }) {
      return campaigns.get(Number(campaignId)) || null;
    },
    async markCampaignRunning({ campaignId }) {
      const campaign = campaigns.get(Number(campaignId));
      campaign.status = "running";
      return campaign;
    },
    async savePointResult({ campaignId, pointId, status, result }) {
      const campaign = campaigns.get(Number(campaignId));
      const point = campaign.points.find((item) => item.id === Number(pointId));
      Object.assign(point, result, { status });
      return point;
    },
    async completeCampaign({ campaignId, status, summary }) {
      const campaign = campaigns.get(Number(campaignId));
      campaign.status = status;
      campaign.summary = summary;
      return campaign;
    },
  };
}

test("5x5 grid is deterministic and centered", () => {
  const first = generateGrid({ centerLat: 48.917, centerLng: 2.268, gridSize: 5, spacingKm: 1 });
  const second = generateGrid({ centerLat: 48.917, centerLng: 2.268, gridSize: 5, spacingKm: 1 });
  assert.deepEqual(first, second);
  assert.equal(first.length, 25);
  assert.deepEqual(first[12], {
    row: 2,
    col: 2,
    latitude: 48.917,
    longitude: 2.268,
    northKm: 0,
    eastKm: 0,
  });
  assert.equal(first[0].northKm, 2);
  assert.equal(first[0].eastKm, -2);
  assert.equal(first[24].northKm, -2);
  assert.equal(first[24].eastKm, 2);
});

test("grid rejects unsafe sizes and spacing", () => {
  assert.throws(() => generateGrid({ centerLat: 48, centerLng: 2, gridSize: 4 }), /odd integer/);
  assert.throws(() => generateGrid({ centerLat: 48, centerLng: 2, gridSize: 13 }), /odd integer/);
  assert.throws(() => generateGrid({ centerLat: 48, centerLng: 2, gridSize: 5, spacingKm: 0 }), /spacingKm/);
});

test("summary uses measured points as denominator", () => {
  const summary = summarizePoints([
    { status: "success", found: true, position: 1 },
    { status: "success", found: true, position: 4 },
    { status: "success", found: true, position: 12 },
    { status: "success", found: false, position: null },
    { status: "error", found: false, position: null },
  ]);
  assert.deepEqual(summary, {
    totalPoints: 5,
    measuredPoints: 4,
    errorPoints: 1,
    foundPoints: 3,
    presenceRate: 0.75,
    top3Points: 1,
    top3Rate: 0.25,
    top10Points: 2,
    top10Rate: 0.5,
    top20Points: 3,
    top20Rate: 0.75,
    averagePosition: 5.67,
    bestPosition: 1,
    worstPosition: 12,
  });
});

test("same campaign definition is idempotent", async () => {
  const repository = memoryRepository();
  const provider = { name: "mock", async measurePoint() { return { found: true, position: 2 }; } };
  const service = new RankingGridService({ repository, provider });
  const input = {
    tenantId: "tenant-1",
    agencyId: 2,
    keywordId: 7,
    centerLat: 48.917,
    centerLng: 2.268,
    gridSize: 5,
    spacingKm: 1,
  };
  const first = await service.createCampaign(input);
  const second = await service.createCampaign(input);
  assert.equal(first.id, second.id);
  assert.equal(repository.campaigns.size, 1);
  assert.equal(first.points.length, 25);
  assert.equal(campaignKey(input), first.key);
});

test("rerun measures only points not already successful", async () => {
  const repository = memoryRepository();
  let calls = 0;
  const provider = {
    name: "mock",
    async measurePoint({ latitude, longitude }) {
      calls += 1;
      return { found: true, position: calls % 3 === 0 ? 4 : 2, latitude, longitude };
    },
  };
  const service = new RankingGridService({ repository, provider, concurrency: 3 });
  const campaign = await service.createCampaign({
    tenantId: "tenant-1",
    agencyId: 2,
    keywordId: 7,
    centerLat: 48.917,
    centerLng: 2.268,
    gridSize: 5,
    spacingKm: 1,
  });
  await service.runCampaign({ tenantId: "tenant-1", campaignId: campaign.id });
  assert.equal(calls, 25);
  const completed = await repository.getCampaign({ campaignId: campaign.id });
  assert.equal(completed.status, "completed");
  assert.equal(completed.summary.totalPoints, 25);
  assert.equal(completed.summary.errorPoints, 0);

  await service.runCampaign({ tenantId: "tenant-1", campaignId: campaign.id });
  assert.equal(calls, 25, "successful points must not be measured again");
});

test("partial provider failure is preserved and replayable", async () => {
  const repository = memoryRepository();
  let failOnce = true;
  const provider = {
    name: "mock",
    async measurePoint({ latitude }) {
      if (failOnce) {
        failOnce = false;
        const error = new Error("temporary provider failure");
        error.code = "TEMP";
        throw error;
      }
      return { found: true, position: latitude > 0 ? 3 : 8 };
    },
  };
  const service = new RankingGridService({ repository, provider, concurrency: 2 });
  const campaign = await service.createCampaign({
    tenantId: "tenant-1",
    agencyId: 2,
    keywordId: 7,
    centerLat: 48.917,
    centerLng: 2.268,
    gridSize: 3,
    spacingKm: 1,
  });
  const first = await service.runCampaign({ tenantId: "tenant-1", campaignId: campaign.id });
  assert.equal(first.status, "partial");
  assert.equal(first.summary.errorPoints, 1);
  const callsAfterFirst = first.points.filter((point) => point.status === "success").length;
  assert.equal(callsAfterFirst, 8);

  const second = await service.runCampaign({ tenantId: "tenant-1", campaignId: campaign.id });
  assert.equal(second.status, "completed");
  assert.equal(second.summary.errorPoints, 0);
  assert.equal(second.points.filter((point) => point.status === "success").length, 9);
});
