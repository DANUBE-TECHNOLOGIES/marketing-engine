"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_ESTIMATED_COST_PER_POINT_USD,
  normalizeCampaignIds,
  estimatedCost,
  loadPaidRolloutPlan,
} = require("../src/modules/ranking-grid/network-paid-plan");

test("paid rollout planner normalizes campaign selection and pilot pricing", async () => {
  assert.deepEqual(normalizeCampaignIds("2,3,3,foo,0"), [2, 3]);
  assert.equal(DEFAULT_ESTIMATED_COST_PER_POINT_USD, 0.002);
  assert.equal(estimatedCost(25), 0.05);
  assert.equal(estimatedCost(200), 0.4);
});

test("paid rollout planner excludes already successful campaign points from estimate", async () => {
  let queryCalls = 0;
  const prisma = {
    $queryRaw: async () => {
      queryCalls += 1;
      return [
        {
          campaignId: 1,
          agencyId: 6,
          agencyName: "Bois-Colombes",
          city: "Bois-Colombes",
          keywordId: 2,
          keyword: "agence de voyage",
          campaignStatus: "completed",
          gridSize: 5,
          spacingKm: 1,
          totalPoints: 25,
          successPoints: 25,
          remainingPoints: 0,
          recordedCostUsd: 0.05,
        },
        {
          campaignId: 3,
          agencyId: 3,
          agencyName: "Dax",
          city: "Dax",
          keywordId: 7,
          keyword: "agence de voyage",
          campaignStatus: "pending",
          gridSize: 5,
          spacingKm: 1,
          totalPoints: 25,
          successPoints: 0,
          remainingPoints: 25,
          recordedCostUsd: 0,
        },
      ];
    },
  };

  const plan = await loadPaidRolloutPlan(prisma, "tenant_mondescale");

  assert.equal(queryCalls, 1);
  assert.equal(plan.summary.campaigns, 2);
  assert.equal(plan.summary.eligibleCampaigns, 1);
  assert.equal(plan.summary.completedCampaigns, 1);
  assert.equal(plan.summary.remainingPoints, 25);
  assert.equal(plan.summary.estimatedCostUsd, 0.05);
  assert.equal(plan.summary.recordedCostUsd, 0.05);
  assert.equal(plan.campaigns[0].eligible, false);
  assert.equal(plan.campaigns[1].eligible, true);
  assert.equal(plan.campaigns[1].estimatedCostUsd, 0.05);
  assert.equal(plan.pricing.guaranteed, false);
});

test("paid rollout planner supports partial rerun estimates", async () => {
  const prisma = {
    $queryRaw: async () => [{
      campaignId: 7,
      agencyId: 8,
      agencyName: "Melun",
      city: "Melun",
      keywordId: 5,
      keyword: "agence de voyage",
      campaignStatus: "partial",
      gridSize: 5,
      spacingKm: 1,
      totalPoints: 25,
      successPoints: 20,
      remainingPoints: 5,
      recordedCostUsd: 0.04,
    }],
  };

  const plan = await loadPaidRolloutPlan(prisma, "tenant_mondescale", {
    campaignIds: [7],
  });

  assert.equal(plan.summary.eligibleCampaigns, 1);
  assert.equal(plan.summary.remainingPoints, 5);
  assert.equal(plan.summary.estimatedCostUsd, 0.01);
  assert.equal(plan.campaigns[0].recordedCostUsd, 0.04);
});
