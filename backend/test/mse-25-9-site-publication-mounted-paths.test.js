"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SiteReadinessClient,
} = require("../src/modules/site-publication/readiness-client");
const {
  PagePublicationClient,
} = require("../src/modules/site-publication/page-publication-client");

test("MSE-25.9 readiness client targets the mounted agency-launch API", async () => {
  const originalFetch = global.fetch;
  let capturedUrl = null;

  global.fetch = async (url) => {
    capturedUrl = String(url);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        readiness: { score: 100 },
        checks: [],
      }),
    };
  };

  try {
    const client = new SiteReadinessClient({
      backendOrigin: "http://backend:4000",
    });

    await client.check({
      agencyId: 6,
      headers: { "x-tenant-slug": "mondescale" },
    });

    assert.equal(
      capturedUrl,
      "http://backend:4000/api/agency-launch/agencies/6/readiness"
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("MSE-25.9 page publication client targets the mounted site-publication API", async () => {
  const originalFetch = global.fetch;
  let capturedUrl = null;
  let capturedBody = null;

  global.fetch = async (url, options) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    };
  };

  try {
    const client = new PagePublicationClient({
      backendOrigin: "http://backend:4000",
    });

    await client.publish({
      pageId: "page-home",
      headers: { "x-tenant-slug": "mondescale" },
      body: { siteId: "site-1" },
    });

    assert.equal(
      capturedUrl,
      "http://backend:4000/api/site-publication/publication/pages/page-home/publish"
    );
    assert.deepEqual(capturedBody, { siteId: "site-1" });
  } finally {
    global.fetch = originalFetch;
  }
});
