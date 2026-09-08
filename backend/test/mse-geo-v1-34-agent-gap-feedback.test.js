"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const service = require("../src/knowledge/agent-knowledge-gaps.service");

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

function validPayload(overrides = {}) {
  return {
    mode: "read-only",
    inference: false,
    source: "knowledge-search-audit",
    siteSlug: "maurepas",
    totalUnknownSearches: 3,
    uniqueGapCount: 1,
    gaps: [{
      siteSlug: "maurepas",
      query: "Voyages en train depuis Maurepas",
      normalizedQuery: "voyages en train depuis maurepas",
      occurrences: 3,
      firstSeenAt: "2026-09-08T08:00:00.000Z",
      lastSeenAt: "2026-09-08T09:00:00.000Z",
    }],
    ...overrides,
  };
}

test("fails closed when server-to-server configuration is absent", async () => {
  delete process.env.MONDESCALE_AI_AGENT_BASE_URL;
  delete process.env.MONDESCALE_AI_KNOWLEDGE_ADMIN_TOKEN;
  await assert.rejects(() => service.report(), /BASE_URL is required/);
});

test("performs GET only with server-side token and exact filters", async () => {
  process.env.MONDESCALE_AI_AGENT_BASE_URL = "https://agent.example.test";
  process.env.MONDESCALE_AI_KNOWLEDGE_ADMIN_TOKEN = "secret-token";
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push([String(url), init]);
    return new Response(JSON.stringify(validPayload()), { status: 200 });
  };
  const result = await service.report({ siteSlug: "maurepas", limit: 25, fetchImpl });
  assert.equal(result.mode, "read-only");
  assert.equal(result.gaps.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://agent.example.test/api/knowledge/gaps?siteSlug=maurepas&limit=25");
  assert.equal(calls[0][1].method, "GET");
  assert.equal(calls[0][1].headers["x-knowledge-admin-token"], "secret-token");
  assert.equal(JSON.stringify(result).includes("secret-token"), false);
});

test("rejects weakened provenance and HTTP failures", async () => {
  process.env.MONDESCALE_AI_AGENT_BASE_URL = "https://agent.example.test";
  process.env.MONDESCALE_AI_KNOWLEDGE_ADMIN_TOKEN = "secret-token";
  await assert.rejects(
    () => service.report({ fetchImpl: async () => new Response(JSON.stringify(validPayload({ inference: true })), { status: 200 }) }),
    /provenance contract rejected/
  );
  await assert.rejects(
    () => service.report({ fetchImpl: async () => new Response("unavailable", { status: 503 }) }),
    /request failed \(503\)/
  );
});

test("rejects malformed gap items and mismatched exact siteSlug", async () => {
  process.env.MONDESCALE_AI_AGENT_BASE_URL = "https://agent.example.test";
  process.env.MONDESCALE_AI_KNOWLEDGE_ADMIN_TOKEN = "secret-token";
  await assert.rejects(
    () => service.report({ fetchImpl: async () => new Response(JSON.stringify(validPayload({ gaps: [{ query: "x" }] })), { status: 200 }) }),
    /item contract rejected/
  );
  await assert.rejects(
    () => service.report({ siteSlug: "ozoir", fetchImpl: async () => new Response(JSON.stringify(validPayload()), { status: 200 }) }),
    /exact siteSlug contract rejected/
  );
});

test("network route exposes GET agent-gaps only", () => {
  const routeSource = fs.readFileSync(path.join(__dirname, "../src/knowledge/network-geo.routes.js"), "utf8");
  assert.match(routeSource, /router\.get\("\/agent-gaps"/);
  assert.doesNotMatch(routeSource, /router\.post\("\/agent-gaps"/);
  assert.match(routeSource, /agentKnowledgeGapsService\.report/);
});
