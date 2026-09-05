"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  actionLever,
  normalizeStatus,
  trackingMetadata,
  parseTrackingMetadata,
  measureTrackedImpact,
} = require("../src/modules/ranking-grid/territorial-action-tracker");

const root = path.resolve(__dirname, "..");

function campaign(id, ranks) {
  return {
    id,
    keywordId: 2,
    points: ranks.map((rank, index) => ({
      row: 4,
      col: index,
      position: rank,
    })),
  };
}

test("tracking key is deterministic and statuses are bounded", () => {
  assert.equal(
    actionLever({ campaignId: 11, city: "Levallois-Perret", actionCode: "local_proof" }),
    "ranking-grid-territorial:11:Levallois-Perret:local_proof",
  );
  assert.equal(normalizeStatus("in_progress"), "in_progress");
  assert.throws(() => normalizeStatus("archived"), /todo,in_progress,done/);
});

test("tracking metadata preserves territorial baseline cells", () => {
  const metadata = trackingMetadata({
    campaign: { id: 11, keywordId: 2 },
    methodologyKey: "mse-25.125u-z14-v1:z14:d100:sp0:sta1",
    territory: {
      city: "Levallois-Perret",
      urgency: "critical",
      averageRank: 61,
      worstRank: 63,
      gridCells: [
        { row: 4, col: 3, rank: 63 },
        { row: 4, col: 4, rank: 59 },
      ],
    },
    action: { code: "local_proof", type: "content" },
  });

  assert.equal(metadata.sourceCampaignId, 11);
  assert.equal(metadata.keywordId, 2);
  assert.equal(metadata.territoryCity, "Levallois-Perret");
  assert.deepEqual(metadata.baseline.cells, [
    { row: 4, col: 3, rank: 63 },
    { row: 4, col: 4, rank: 59 },
  ]);
  assert.deepEqual(parseTrackingMetadata(JSON.stringify(metadata)), metadata);
});

test("impact measurement reports positive gain when ranks improve", () => {
  const metadata = {
    baseline: {
      cells: [
        { row: 4, col: 0, rank: 30 },
        { row: 4, col: 1, rank: 20 },
        { row: 4, col: 2, rank: 10 },
      ],
    },
  };

  const impact = measureTrackedImpact(metadata, campaign(19, [20, 20, 5]));
  assert.equal(impact.campaignId, 19);
  assert.equal(impact.comparableCells, 3);
  assert.equal(impact.baselineAverageRank, 20);
  assert.equal(impact.currentAverageRank, 15);
  assert.equal(impact.averageRankGain, 5);
  assert.equal(impact.improved, 2);
  assert.equal(impact.declined, 0);
  assert.equal(impact.unchanged, 1);
});

test("route source exposes tracked CRUD without DataForSEO or IGN calls", () => {
  const source = fs.readFileSync(
    path.join(root, "src/modules/ranking-grid/spatial-routes.js"),
    "utf8",
  );
  assert.match(source, /router\.get\("\/rankings\/grid\/territorial-actions"/);
  assert.match(source, /router\.post\("\/rankings\/grid\/territorial-actions"/);
  assert.match(source, /router\.patch\("\/rankings\/grid\/territorial-actions\/:actionId"/);
  assert.match(source, /providerCalls:\s*0/);
  assert.match(source, /externalCalls:\s*0/);
});
