"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { RankingGridRepository } = require("../src/modules/ranking-grid/repository");

test("persisted grid campaign listing groups points without provider access", async () => {
  let queryCalls = 0;
  const prisma = {
    async $queryRaw() {
      queryCalls += 1;
      if (queryCalls === 1) {
        return [
          {
            id: 42,
            agencyId: 2,
            agencyName: "Mondescale Bois-Colombes",
            keyword: "agence de voyage",
            city: "Bois-Colombes",
            gridSize: 5,
            status: "completed",
          },
        ];
      }
      if (queryCalls === 2) {
        return [
          { id: 1, campaignId: 42, row: 0, col: 0, status: "success", found: true, position: 2 },
          { id: 2, campaignId: 42, row: 0, col: 1, status: "success", found: false, position: null },
        ];
      }
      throw new Error("unexpected query");
    },
  };

  const repository = new RankingGridRepository(prisma);
  const campaigns = await repository.listCampaigns({ tenantId: 1, limit: 6 });

  assert.equal(queryCalls, 2);
  assert.equal(campaigns.length, 1);
  assert.equal(campaigns[0].id, 42);
  assert.equal(campaigns[0].agencyName, "Mondescale Bois-Colombes");
  assert.equal(campaigns[0].points.length, 2);
  assert.deepEqual(campaigns[0].points.map((point) => point.position), [2, null]);
});

test("persisted grid campaign listing skips point query when empty", async () => {
  let queryCalls = 0;
  const prisma = {
    async $queryRaw() {
      queryCalls += 1;
      return [];
    },
  };

  const repository = new RankingGridRepository(prisma);
  const campaigns = await repository.listCampaigns({ tenantId: 1, limit: 6 });

  assert.deepEqual(campaigns, []);
  assert.equal(queryCalls, 1);
});
