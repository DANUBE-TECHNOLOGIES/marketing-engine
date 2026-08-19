"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { routes } = require("../src/modules/minisite-semantic-engine/routes");

async function withServer(run) {
  const service = {
    health: () => ({ status: "ok", readOnly: true, writes: false, destructive: false, doorwayGuard: true }),
    previewAgency: async ({ agencyId }) => ({ version: "mse-25.40", operation: "local-semantic-preview", readOnly: true, writes: false, destructive: false, site: { agencyId }, planFingerprint: "a".repeat(64) }),
    previewNetwork: async () => ({ version: "mse-25.40", operation: "network-local-semantic-preview", readOnly: true, writes: false, destructive: false, planFingerprint: "b".repeat(64), agencies: [] }),
  };
  const app = express();
  app.use(express.json());
  app.use(routes({ service }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("semantic engine exposes only health and read-only previews", async () => {
  await withServer(async (origin) => {
    const health = await fetch(`${origin}/minisite-semantic-engine/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).writes, false);

    const agency = await fetch(`${origin}/minisite-semantic-engine/agencies/4/preview`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const agencyBody = await agency.json();
    assert.equal(agency.status, 200);
    assert.equal(agencyBody.readOnly, true);
    assert.equal(agencyBody.site.agencyId, "4");

    const network = await fetch(`${origin}/minisite-semantic-engine/network/preview`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(network.status, 200);
    assert.equal((await network.json()).writes, false);

    for (const suffix of ["apply", "publish", "create", "rollout"]) {
      const response = await fetch(`${origin}/minisite-semantic-engine/network/${suffix}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      assert.equal(response.status, 404);
    }
  });
});
