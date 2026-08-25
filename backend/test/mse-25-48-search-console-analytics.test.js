"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { defaultDateRange, normalizeRows, fetchSearchAnalytics } = require("../src/modules/minisite-semantic-engine/search-console-analytics");

test("search console date range uses 28 final-data days ending three days ago", () => {
  assert.deepEqual(defaultDateRange(new Date("2026-08-25T12:00:00Z")), { startDate: "2026-07-26", endDate: "2026-08-22" });
});

test("search console rows are normalized for demand evidence", () => {
  assert.deepEqual(normalizeRows([{ keys: ["croisières gien", "https://example.test/gien/services"], clicks: 2, impressions: 80, ctr: 0.025, position: 12.5 }]), [{ query: "croisières gien", page: "https://example.test/gien/services", clicks: 2, impressions: 80, ctr: 0.025, position: 12.5 }]);
});

test("search console ingestion is read-only and uses query/page dimensions", async () => {
  let request = null;
  const analytics = await fetchSearchAnalytics({
    siteUrl: "sc-domain:mondescale.com",
    accessToken: "secret-token",
    startDate: "2026-07-01",
    endDate: "2026-07-28",
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return { ok: true, status: 200, json: async () => ({ rows: [{ keys: ["voyage gien", "https://gien.mondescale.com/services"], clicks: 1, impressions: 40, ctr: 0.025, position: 18 }] }) };
    },
  });
  assert.match(request.url, /searchAnalytics\/query$/);
  assert.equal(request.options.method, "POST");
  assert.deepEqual(request.body.dimensions, ["query", "page"]);
  assert.equal(request.body.dataState, "final");
  assert.equal(request.body.type, "web");
  assert.equal(analytics.rowCount, 1);
  assert.equal(analytics.readOnly, true);
  assert.equal(analytics.writes, false);
  assert.equal(JSON.stringify(request).includes("secret-token"), true);
  assert.equal(JSON.stringify(analytics).includes("secret-token"), false);
});

test("search console ingestion fails closed on API error", async () => {
  await assert.rejects(() => fetchSearchAnalytics({
    siteUrl: "sc-domain:mondescale.com",
    accessToken: "token",
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ error: { message: "forbidden" } }) }),
  }), (error) => error.code === "MSE_25_48_SEARCH_CONSOLE_FETCH_FAILED" && error.statusCode === 403);
});
