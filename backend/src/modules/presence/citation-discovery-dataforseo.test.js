"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  authHeader,
  assertConfigured,
  submitDiscoveryTask,
  readDiscoveryTask
} = require("./citation-discovery-dataforseo");

const config = {
  enabled: true,
  credentials: { login: "user", password: "pass" },
  endpoints: {
    baseUrl: "https://api.example.test/v3",
    serpTaskPost: "/serp/google/organic/task_post",
    serpTaskGet: "/serp/google/organic/task_get/regular"
  }
};

test("DataForSEO discovery requires explicit enablement and credentials", () => {
  assert.equal(authHeader(config), `Basic ${Buffer.from("user:pass").toString("base64")}`);
  assert.throws(() => assertConfigured({ ...config, enabled: false }), /not configured/);
});

test("discovery task submission is deterministic", async () => {
  let request = null;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ tasks: [{ id: "task-1", status_code: 20100 }] })
    };
  };

  const result = await submitDiscoveryTask("site:pagesjaunes.fr Mondescale Nevers", { config, fetchImpl });
  assert.equal(result.taskId, "task-1");
  assert.equal(request.url, "https://api.example.test/v3/serp/google/organic/task_post");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload[0].language_code, "fr");
  assert.equal(payload[0].location_code, 2250);
});

test("discovery result keeps only organic URL candidates", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      tasks: [{
        status_code: 20000,
        status_message: "Ok.",
        result: [{
          items: [
            { type: "organic", url: "https://www.pagesjaunes.fr/pros/123", title: "Mondescale" },
            { type: "paid", url: "https://ads.example.test" },
            { type: "organic", title: "No URL" }
          ]
        }]
      }]
    })
  });

  const result = await readDiscoveryTask("task-1", { config, fetchImpl });
  assert.equal(result.ready, true);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].url, "https://www.pagesjaunes.fr/pros/123");
});
