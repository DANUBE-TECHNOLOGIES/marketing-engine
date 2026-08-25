"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getSearchConsoleAccessToken, getSearchConsoleTokenReadiness } = require("../src/modules/minisite-semantic-engine/search-console-token-provider");

function prismaFixture({ searchToken = null, businessToken = null } = {}) {
  const updates = [];
  return {
    updates,
    googleToken: {
      async findFirst({ where }) {
        if (where.provider === "search-console") return searchToken;
        if (where.provider === "google") return businessToken;
        return null;
      },
      async update(args) { updates.push(args); return { ...searchToken, ...args.data }; },
    },
  };
}

test("env token is accepted without touching persisted Google Business token", async () => {
  const prisma = prismaFixture({ businessToken: { refreshToken: "business-refresh" } });
  const token = await getSearchConsoleAccessToken({ prisma, envToken: "sc-env-token" });
  assert.equal(token.source, "env");
  assert.equal(token.accessToken, "sc-env-token");
  assert.equal(prisma.updates.length, 0);
});

test("dedicated search-console refresh token is refreshed independently", async () => {
  const prisma = prismaFixture({ searchToken: { id: 7, refreshToken: "sc-refresh" }, businessToken: { refreshToken: "business-refresh" } });
  const previousId = process.env.GOOGLE_CLIENT_ID;
  const previousSecret = process.env.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_CLIENT_ID = "client";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  try {
    const token = await getSearchConsoleAccessToken({
      prisma,
      envToken: "",
      fetchImpl: async () => ({ ok: true, async json() { return { access_token: "fresh-sc", expires_in: 3600 }; } }),
    });
    assert.equal(token.source, "persisted-refresh-token");
    assert.equal(token.accessToken, "fresh-sc");
    assert.equal(prisma.updates.length, 1);
    assert.equal(prisma.updates[0].where.id, 7);
  } finally {
    if (previousId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = previousId;
    if (previousSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET; else process.env.GOOGLE_CLIENT_SECRET = previousSecret;
  }
});

test("readiness reports Search Console separately from Google Business", async () => {
  const prisma = prismaFixture({ searchToken: null, businessToken: { refreshToken: "business-refresh" } });
  const readiness = await getSearchConsoleTokenReadiness({ prisma });
  assert.equal(readiness.searchConsoleTokenConfigured, false);
  assert.equal(readiness.businessTokenPreserved, true);
});
