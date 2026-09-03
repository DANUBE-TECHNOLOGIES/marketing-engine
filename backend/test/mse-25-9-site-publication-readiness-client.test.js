"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  SiteReadinessClient,
  forwardedHeaders,
} = require("../src/modules/site-publication/readiness-client");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 site publication calls the mounted agency-launch readiness endpoint", async () => {
  const originalFetch = global.fetch;
  let requestedUrl = null;
  let requestedHeaders = null;

  global.fetch = async (url, options) => {
    requestedUrl = String(url);
    requestedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        agency: { id: 6 },
        site: { id: "site-6" },
        readiness: { score: 100 },
        checks: [
          { code: "SITE", required: true, passed: true },
        ],
      }),
    };
  };

  try {
    const client = new SiteReadinessClient({
      backendOrigin: "http://backend:4000",
    });

    const readiness = await client.check({
      agencyId: 6,
      headers: { "x-tenant-slug": "mondescale" },
    });

    assert.equal(
      requestedUrl,
      "http://backend:4000/api/agency-launch/agencies/6/readiness"
    );
    assert.equal(requestedHeaders["x-tenant-slug"], "mondescale");
    assert.equal(readiness.score, 100);
    assert.equal(readiness.summary.missing, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("MSE-25.9 readiness client path matches the actual server mount", () => {
  const server = source("backend/src/server.js");
  const client = source("backend/src/modules/site-publication/readiness-client.js");

  assert.match(server, /app\.use\(\s*["']\/api\/agency-launch["']/);
  assert.match(client, /readinessPathPrefix\s*=\s*["']\/api\/agency-launch["']/);
});

test("MSE-25.9 readiness tenant fallback is deployment configurable", () => {
  const headers = forwardedHeaders({ "x-tenant-slug": "tenant-demo" });
  assert.equal(headers["x-tenant-slug"], "tenant-demo");
});
