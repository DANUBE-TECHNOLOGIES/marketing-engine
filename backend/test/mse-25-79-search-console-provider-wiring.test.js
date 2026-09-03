"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createSearchConsoleProvider, searchConsoleProviderReadiness } = require("../src/modules/search-console-submission/provider-factory");

function prismaStub({ token = null, businessToken = null } = {}) {
  return {
    googleToken: {
      findFirst: async ({ where }) => where.provider === "search-console" ? token : businessToken,
      update: async () => ({}),
    },
  };
}

test("MSE-25.79 wires Google provider when prisma is available", () => {
  const provider = createSearchConsoleProvider({ prisma: prismaStub() });
  assert.equal(provider.name, "google-search-console");
  assert.equal(provider.isConfigured(), true);
});

test("MSE-25.79 reports persisted refresh token readiness", async () => {
  const oldId = process.env.GOOGLE_CLIENT_ID;
  const oldSecret = process.env.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_CLIENT_ID = "client";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  try {
    const readiness = await searchConsoleProviderReadiness({
      prisma: prismaStub({ token: { refreshToken: "refresh", accessToken: "cached", expiryDate: BigInt(Date.now() + 3600000) } }),
    });
    assert.equal(readiness.configured, true);
    assert.equal(readiness.searchConsoleTokenConfigured, true);
    assert.equal(readiness.googleClientConfigured, true);
  } finally {
    if (oldId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = oldId;
    if (oldSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET; else process.env.GOOGLE_CLIENT_SECRET = oldSecret;
  }
});

test("MSE-25.79 preserves disabled provider only without prisma", () => {
  const provider = createSearchConsoleProvider();
  assert.equal(provider.name, "disabled");
  assert.equal(provider.isConfigured(), false);
});
