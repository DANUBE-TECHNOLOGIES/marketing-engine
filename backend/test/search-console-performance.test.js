"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { SearchConsolePerformanceService } = require("../src/modules/search-console-submission/performance");

test("MSE-25.20 separates aggregate metrics from detailed Search Analytics rows", async () => {
  const calls = [];
  const provider = {
    isConfigured: () => true,
    async assertSiteAccess(siteUrl) {
      assert.equal(siteUrl, "sc-domain:agences.example.test");
      return { siteUrl, permissionLevel: "siteFullUser" };
    },
    async googleRequest(url, options) {
      calls.push({ url, options, body: JSON.parse(options.body) });
      const isAggregate = !Object.hasOwn(JSON.parse(options.body), "dimensions");
      return {
        async json() {
          return isAggregate
            ? { rows: [{ clicks: 12, impressions: 300, ctr: 0.04, position: 8.5 }] }
            : { rows: [
                { keys: ["agence voyage gien"], clicks: 5, impressions: 80, ctr: 0.0625, position: 3.2 },
                { keys: ["voyage sicile gien"], clicks: 2, impressions: 40, ctr: 0.05, position: 6.1 },
              ] };
        },
      };
    },
  };

  const service = new SearchConsolePerformanceService({ provider });
  const result = await service.query({
    siteUrl: "sc-domain:agences.example.test",
    pagePrefix: "https://agences.example.test/agence/gien/",
    dimensions: ["query"],
    days: 28,
    rowLimit: 50,
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(calls[0].body.dimensions, undefined);
  assert.deepEqual(calls[1].body.dimensions, ["query"]);
  assert.equal(calls[0].body.dimensionFilterGroups[0].filters[0].dimension, "page");
  assert.equal(calls[0].body.dimensionFilterGroups[0].filters[0].operator, "contains");
  assert.equal(result.totals.clicks, 12);
  assert.equal(result.totals.impressions, 300);
  assert.equal(result.totals.ctr, 0.04);
  assert.equal(result.totals.position, 8.5);
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
