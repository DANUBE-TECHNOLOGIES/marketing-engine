"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { RankingGridService, normalizeSnapshotDate, snapshotKey } = require("../src/modules/ranking-grid/service");
const { compareCampaigns } = require("../src/modules/ranking-grid/comparison");

function sourceCampaign() {
  return {
    id: 1,
    agencyId: 6,
    keywordId: 2,
    keyword: "agence de voyage",
    city: "Bois-Colombes",
    centerLat: 48.91398,
    centerLng: 2.273679,
    gridSize: 3,
    spacingKm: 1,
    status: "completed",
    summary: { presenceRate: 0.44, top3Rate: 0.11, top10Rate: 0.33, top20Rate: 0.44, averagePosition: 8, foundPoints: 4 },
    completedAt: "2026-09-04T17:47:24.857Z",
    points: [
      { id: 1, row: 0, col: 0, latitude: 1, longitude: 1, northKm: 1, eastKm: -1, status: "success", found: false, position: null },
      { id: 2, row: 0, col: 1, latitude: 1, longitude: 2, northKm: 1, eastKm: 0, status: "success", found: true, position: 8 },
      { id: 3, row: 0, col: 2, latitude: 1, longitude: 3, northKm: 1, eastKm: 1, status: "success", found: true, position: 3 },
      { id: 4, row: 1, col: 0, latitude: 2, longitude: 1, northKm: 0, eastKm: -1, status: "success", found: false, position: null },
      { id: 5, row: 1, col: 1, latitude: 2, longitude: 2, northKm: 0, eastKm: 0, status: "success", found: true, position: 2 },
      { id: 6, row: 1, col: 2, latitude: 2, longitude: 3, northKm: 0, eastKm: 1, status: "success", found: false, position: null },
      { id: 7, row: 2, col: 0, latitude: 3, longitude: 1, northKm: -1, eastKm: -1, status: "success", found: true, position: 19 },
      { id: 8, row: 2, col: 1, latitude: 3, longitude: 2, northKm: -1, eastKm: 0, status: "success", found: false, position: null },
      { id: 9, row: 2, col: 2, latitude: 3, longitude: 3, northKm: -1, eastKm: 1, status: "success", found: false, position: null },
    ],
  };
}

function snapshotRepository() {
  const source = sourceCampaign();
  let nextId = 2;
  const campaigns = new Map([[1, source]]);
  return {
    campaigns,
    async getCampaign({ campaignId }) { return campaigns.get(Number(campaignId)) || null; },
    async findCampaignByKey({ key }) { return [...campaigns.values()].find((item) => item.key === key) || null; },
    async createCampaignWithPoints(input) {
      const campaign = {
        ...input,
        id: nextId++,
        status: "pending",
        summary: null,
        points: input.points.map((point, index) => ({ ...point, id: 100 + index, status: "pending", found: false, position: null })),
      };
      campaigns.set(campaign.id, campaign);
      return campaign;
    },
  };
}

test("snapshot date validation is strict", () => {
  assert.equal(normalizeSnapshotDate("2026-09-05"), "2026-09-05");
  assert.throws(() => normalizeSnapshotDate("05/09/2026"), /YYYY-MM-DD/);
  assert.throws(() => normalizeSnapshotDate("2026-02-30"), /valid calendar date/);
});

test("snapshot key is stable for one day and differs across days", () => {
  const campaign = sourceCampaign();
  const first = snapshotKey(campaign, "2026-09-05");
  assert.equal(first, snapshotKey(campaign, "2026-09-05"));
  assert.notEqual(first, snapshotKey(campaign, "2026-09-06"));
  assert.match(first, /:snapshot:2026-09-05$/);
});

test("createSnapshot is idempotent per date but creates history across dates", async () => {
  const repository = snapshotRepository();
  const service = new RankingGridService({ repository, provider: { name: "unconfigured" } });

  const first = await service.createSnapshot({ tenantId: "tenant", sourceCampaignId: 1, snapshotDate: "2026-09-05" });
  const duplicate = await service.createSnapshot({ tenantId: "tenant", sourceCampaignId: 1, snapshotDate: "2026-09-05" });
  const nextDay = await service.createSnapshot({ tenantId: "tenant", sourceCampaignId: 1, snapshotDate: "2026-09-06" });

  assert.equal(first.id, duplicate.id);
  assert.notEqual(first.id, nextDay.id);
  assert.equal(first.points.length, 9);
  assert.deepEqual(
    first.points.map((point) => [point.row, point.col, point.latitude, point.longitude]),
    sourceCampaign().points.map((point) => [point.row, point.col, point.latitude, point.longitude])
  );
  assert.equal(repository.campaigns.size, 3);
});

test("comparison reports rank movement and presence gains/losses", () => {
  const from = sourceCampaign();
  const to = structuredClone(from);
  to.id = 2;
  to.completedAt = "2026-09-11T10:00:00.000Z";
  to.summary = { presenceRate: 0.56, top3Rate: 0.22, top10Rate: 0.44, top20Rate: 0.56, averagePosition: 6.5, foundPoints: 5 };
  to.points[0].found = true;
  to.points[0].position = 10;
  to.points[1].position = 5;
  to.points[2].position = 7;
  to.points[6].found = false;
  to.points[6].position = null;

  const result = compareCampaigns(from, to);
  assert.deepEqual(result.summaryDelta, {
    presenceRate: 0.12,
    top3Rate: 0.11,
    top10Rate: 0.11,
    top20Rate: 0.12,
    averagePosition: -1.5,
    foundPoints: 1,
  });
  assert.equal(result.movement.gainedPresence, 1);
  assert.equal(result.movement.lostPresence, 1);
  assert.equal(result.movement.improved, 1);
  assert.equal(result.movement.declined, 1);
  assert.equal(result.cells.length, 9);
});

test("comparison rejects different agency or keyword scopes", () => {
  const from = sourceCampaign();
  const to = structuredClone(from);
  to.id = 2;
  to.agencyId = 7;
  assert.throws(
    () => compareCampaigns(from, to),
    (error) => error.code === "RANKING_GRID_COMPARISON_SCOPE_MISMATCH"
  );
});
