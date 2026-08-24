"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildOperationalReadiness } = require("./operational-readiness");
const { REQUIRED_COLUMNS } = require("./directory-schema-audit");

function schemaRows(ready = true) {
  const rows = [];
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    for (const column of columns) rows.push({ tableName: table, columnName: column });
  }
  return ready ? rows : rows.filter((row) => !(row.tableName === "DirectoryListing" && row.columnName === "automationStatus"));
}

function prismaMock({ schemaReady = true, refreshToken = "refresh" } = {}) {
  return {
    $queryRawUnsafe: async () => schemaRows(schemaReady),
    googleToken: { findFirst: async () => refreshToken ? { refreshToken, createdAt: new Date() } : null }
  };
}

test("Google managed writes are blocked without OAuth environment", async () => {
  const readiness = await buildOperationalReadiness(prismaMock(), {});
  assert.equal(readiness.readyForGoogleManagedWrites, false);
  assert.ok(readiness.blockers.includes("google_oauth_config"));
});

test("schema drift blocks Google managed writes", async () => {
  const env = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" };
  const readiness = await buildOperationalReadiness(prismaMock({ schemaReady: false }), env);
  assert.equal(readiness.readyForGoogleManagedWrites, false);
  assert.ok(readiness.blockers.includes("directory_schema"));
});

test("discovery readiness requires enablement and both DataForSEO credentials", async () => {
  const env = {
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    DATAFORSEO_ENABLED: "true",
    DATAFORSEO_LOGIN: "login",
    DATAFORSEO_PASSWORD: "password"
  };
  const readiness = await buildOperationalReadiness(prismaMock(), env);
  assert.equal(readiness.readyForDiscovery, true);
  assert.equal(readiness.readyForGoogleManagedWrites, true);
});

test("DataForSEO credentials alone do not enable discovery", async () => {
  const readiness = await buildOperationalReadiness(prismaMock(), {
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    DATAFORSEO_LOGIN: "login",
    DATAFORSEO_PASSWORD: "password"
  });
  assert.equal(readiness.readyForDiscovery, false);
  assert.ok(readiness.warnings.includes("dataforseo_enabled"));
});
