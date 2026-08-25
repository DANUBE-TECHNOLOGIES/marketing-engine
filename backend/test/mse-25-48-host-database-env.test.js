"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  bootstrapMse2548Env,
  databaseHost,
} = require("../src/modules/minisite-semantic-engine/mse-25-48-env");

test("explicit host database URL overrides inherited Docker DATABASE_URL", () => {
  const previous = {
    database: process.env.DATABASE_URL,
    host: process.env.MSE_25_48_HOST_DATABASE_URL,
    envFile: process.env.MSE_25_48_ENV_FILE,
    legacyEnvFile: process.env.MSE_25_40_ENV_FILE,
  };

  try {
    process.env.DATABASE_URL = "postgresql://user:secret@postgres:5432/local_engine";
    process.env.MSE_25_48_HOST_DATABASE_URL = "postgresql://user:secret@127.0.0.1:5432/local_engine";
    delete process.env.MSE_25_48_ENV_FILE;
    delete process.env.MSE_25_40_ENV_FILE;

    const result = bootstrapMse2548Env();

    assert.equal(result.hostDatabaseOverrideApplied, true);
    assert.equal(result.databaseHost, "127.0.0.1");
    assert.equal(databaseHost(process.env.DATABASE_URL), "127.0.0.1");
  } finally {
    if (previous.database === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.database;
    if (previous.host === undefined) delete process.env.MSE_25_48_HOST_DATABASE_URL;
    else process.env.MSE_25_48_HOST_DATABASE_URL = previous.host;
    if (previous.envFile === undefined) delete process.env.MSE_25_48_ENV_FILE;
    else process.env.MSE_25_48_ENV_FILE = previous.envFile;
    if (previous.legacyEnvFile === undefined) delete process.env.MSE_25_40_ENV_FILE;
    else process.env.MSE_25_40_ENV_FILE = previous.legacyEnvFile;
  }
});
