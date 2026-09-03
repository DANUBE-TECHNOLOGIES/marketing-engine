"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { SearchConsolePerformanceService } = require("../src/modules/search-console-submission/performance");

test("MSE-25.20 separates aggregates, previous period and detailed Search Analytics rows", async () => {
  const calls = [];
  const provider = {
    isConfigured: () => true,
    async assertSiteAccess(siteUrl) {
      assert.equal(siteUrl, "sc-domain:agences.example.test");
      return { siteUrl, permissionLevel: "siteFullUser" };
    },
    async googleRequest(url, options) {
      const body = JSON.parse(options.body);
      calls.push({ url, options, body });
      const isDetail = Array.isArray(body.dimensions);
      const isPrevious = !isDetail && calls.filter((call) => !Array.isArray(call.body.dimensions)).length === 2;
      return {
        async json() {
          if (isDetail) {
            return { rows: [
              { keys: ["agence voyage gien"], clicks: 5, impressions: 80, ctr: 0.0625, position: 3.2 },
              { keys: ["voyage sicile gien"], clicks: 2, impressions: 40, ctr: 0.05, position: 6.1 },
            ] };
          }
          return isPrevious
            ? { rows: [{ clicks: 8, impressions: 250, ctr: 0.032, position: 10.5 }] }
            : { rows: [{ clicks: 12, impressions: 300, ctr: 0.04, position: 8.5 }] };
        },
      };
    },
  };

  const service = new SearchConsolePerformanceService({ provider });
  const result = await service.query({
    siteUrl: "sc-domain:agences.example.test",
    pagePrefix: "https://agences.example.test/agence/gien",
    dimensions: ["query"],
    days: 28,
    rowLimit: 50,
  });

  assert.equal(calls.length, 3);
  assert.equal(calls.every((call) => call.options.method === "POST"), true);
  assert.deepEqual(calls[0].body.dimensions, undefined);
  assert.deepEqual(calls[1].body.dimensions, undefined);
  assert.deepEqual(calls[2].body.dimensions, ["query"]);
  assert.equal(calls[0].body.dimensionFilterGroups[0].filters[0].dimension, "page");
  assert.equal(calls[0].body.dimensionFilterGroups[0].filters[0].operator, "contains");
  assert.equal(result.totals.clicks, 12);
  assert.equal(result.previousTotals.clicks, 8);
  assert.equal(result.delta.clicks, 4);
  assert.equal(result.delta.impressions, 50);
  assert.equal(result.delta.ctr, 0.008);
  assert.equal(result.delta.position, 2);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].dimensions.query, "agence voyage gien");
});

test("MSE-25.20 clamps unsafe periods and dimensions", async () => {
  const provider = {
    isConfigured: () => true,
    assertSiteAccess: async () => ({}),
    googleRequest: async (_url, options) => ({ async json() {
      const body = JSON.parse(options.body);
      return body.dimensions ? { rows: [] } : { rows: [{ clicks: 0, impressions: 0, ctr: 0, position: 0 }] };
    } }),
  };

  const result = await new SearchConsolePerformanceService({ provider }).query({
    siteUrl: "sc-domain:example.test",
    days: 999,
    dimensions: ["query", "secret", "page"],
  });

  assert.equal(result.days, 90);
  assert.deepEqual(result.dimensions, ["query", "page"]);
});
