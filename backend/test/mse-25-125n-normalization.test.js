"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeNoSearchResults,
  NO_SEARCH_ERROR_CODE,
} = require("../src/modules/ranking-grid/no-search-normalization");

test("historical 40102 errors become successful not-found points and campaign completes", async () => {
  const campaign = {
    id: 2,
    provider: "dataforseo-google-maps-live",
    points: [
      { id: 1, status: "success", found: true, position: 2, errorCode: null },
      { id: 2, status: "error", found: false, position: null, errorCode: NO_SEARCH_ERROR_CODE, errorMessage: "No Search Results.", cost: null },
      { id: 3, status: "error", found: false, position: null, errorCode: NO_SEARCH_ERROR_CODE, errorMessage: "No Search Results.", cost: null },
    ],
  };

  const saved = [];
  let completed = null;
  const repository = {
    async getCampaign() { return campaign; },
    async savePointResult({ pointId, status, result }) {
      const point = campaign.points.find((item) => item.id === pointId);
      point.status = status;
      point.found = result.found;
      point.position = result.position;
      point.errorCode = null;
      point.errorMessage = null;
      saved.push({ pointId, status, result });
      return true;
    },
    async completeCampaign({ status, summary }) {
      completed = { status, summary };
      campaign.status = status;
      campaign.summary = summary;
      return campaign;
    },
  };

  const result = await normalizeNoSearchResults({ repository, tenantId: "tenant", campaignId: 2 });

  assert.equal(result.normalizedPoints, 2);
  assert.equal(result.providerCalls, 0);
  assert.equal(saved.length, 2);
  assert.ok(saved.every((entry) => entry.status === "success" && entry.result.found === false));
  assert.equal(completed.status, "completed");
  assert.equal(completed.summary.totalPoints, 3);
  assert.equal(completed.summary.measuredPoints, 3);
  assert.equal(completed.summary.errorPoints, 0);
  assert.equal(completed.summary.foundPoints, 1);
  assert.equal(completed.summary.presenceRate, 0.333);
});

test("normalization leaves unrelated technical errors untouched", async () => {
  const campaign = {
    id: 3,
    provider: "dataforseo-google-maps-live",
    points: [
      { id: 1, status: "success", found: false, position: null },
      { id: 2, status: "error", found: false, position: null, errorCode: "DATAFORSEO_HTTP_500" },
    ],
  };

  const repository = {
    async getCampaign() { return campaign; },
    async savePointResult() { throw new Error("must not normalize unrelated error"); },
    async completeCampaign({ status, summary }) {
      campaign.status = status;
      campaign.summary = summary;
      return campaign;
    },
  };

  const result = await normalizeNoSearchResults({ repository, tenantId: "tenant", campaignId: 3 });
  assert.equal(result.normalizedPoints, 0);
  assert.equal(campaign.status, "partial");
  assert.equal(campaign.summary.errorPoints, 1);
});
