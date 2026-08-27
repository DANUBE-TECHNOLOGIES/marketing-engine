"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildOperationalReadiness } = require("./operational-readiness");
const { REQUIRED_COLUMNS } = require("./directory-schema-audit");
const { REQUIRED_TABLES } = require("./presence-storage-audit");

function schemaRows(ready = true) {
  const rows = [];
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    for (const column of columns) rows.push({ tableName: table, columnName: column });
  }
  return ready ? rows : rows.filter((row) => !(row.tableName === "DirectoryListing" && row.columnName === "automationStatus"));
}

function storageRows(ready = true) {
  const rows = REQUIRED_TABLES.map((tableName) => ({ tableName }));
  return ready ? rows : rows.filter((row) => row.tableName !== "PresenceOperationSnapshot");
}

function prismaMock({ schemaReady = true, storageReady = true, refreshToken = "refresh" } = {}) {
  return {
    $queryRawUnsafe: async (sql) => String(sql).includes("information_schema.tables") ? storageRows(storageReady) : schemaRows(schemaReady),
    googleToken: { findFirst: async () => refreshToken ? { refreshToken, createdAt: new Date() } : null }
  };
}

function googleEnv(extra = {}) {
  return { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret", ...extra };
}

test("Google managed writes are blocked without OAuth environment", async () => {
  const readiness = await buildOperationalReadiness(prismaMock(), {});
  assert.equal(readiness.readyForGoogleManagedWrites, false);
  assert.equal(readiness.readyForGoogleApi, false);
  assert.ok(readiness.blockers.includes("google_oauth_config"));
});

test("Google API can be ready while managed writes remain disabled by kill-switch", async () => {
  const readiness = await buildOperationalReadiness(prismaMock(), googleEnv());
  assert.equal(readiness.readyForGoogleApi, true);
  assert.equal(readiness.readyForGoogleManagedWrites, false);
  assert.equal(readiness.googleWritesEnabled, false);
  assert.ok(readiness.blockers.includes("google_writes_enabled"));
  assert.equal(readiness.apiBlockers.includes("google_writes_enabled"), false);
});

test("explicit Google write enablement opens managed writes only after API prerequisites", async () => {
  const readiness = await buildOperationalReadiness(prismaMock(), googleEnv({ PRESENCE_GOOGLE_WRITES_ENABLED: "true" }));
  assert.equal(readiness.readyForGoogleApi, true);
  assert.equal(readiness.readyForGoogleManagedWrites, true);
  assert.equal(readiness.googleWritesEnabled, true);
});

test("schema drift blocks Google managed writes", async () => {
  const readiness = await buildOperationalReadiness(prismaMock({ schemaReady: false }), googleEnv({ PRESENCE_GOOGLE_WRITES_ENABLED: "true" }));
  assert.equal(readiness.readyForGoogleManagedWrites, false);
  assert.equal(readiness.readyForGoogleApi, false);
  assert.ok(readiness.blockers.includes("directory_schema"));
});

test("missing Presence history storage blocks Google managed writes", async () => {
  const readiness = await buildOperationalReadiness(prismaMock({ storageReady: false }), googleEnv({ PRESENCE_GOOGLE_WRITES_ENABLED: "true" }));
  assert.equal(readiness.readyForGoogleManagedWrites, false);
  assert.equal(readiness.readyForGoogleApi, false);
  assert.ok(readiness.blockers.includes("presence_storage"));
});

test("discovery readiness requires enablement and both DataForSEO credentials", async () => {
  const env = googleEnv({
    PRESENCE_GOOGLE_WRITES_ENABLED: "true",
    DATAFORSEO_ENABLED: "true",
    DATAFORSEO_LOGIN: "login",
    DATAFORSEO_PASSWORD: "password"
  });
  const readiness = await buildOperationalReadiness(prismaMock(), env);
  assert.equal(readiness.readyForDiscovery, true);
  assert.equal(readiness.readyForGoogleManagedWrites, true);
});

test("DataForSEO credentials alone do not enable discovery", async () => {
  const readiness = await buildOperationalReadiness(prismaMock(), googleEnv({
    PRESENCE_GOOGLE_WRITES_ENABLED: "true",
    DATAFORSEO_LOGIN: "login",
    DATAFORSEO_PASSWORD: "password"
  }));
  assert.equal(readiness.readyForDiscovery, false);
  assert.ok(readiness.warnings.includes("dataforseo_enabled"));
});
