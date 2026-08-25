"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { bootstrapMse2548Env } = require("../src/modules/minisite-semantic-engine/mse-25-48-env");

test("backend env keeps DATABASE_URL while root env supplies missing Google credentials", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-48-env-"));
  const backendDir = path.join(tmp, "backend");
  fs.mkdirSync(backendDir);

  const backendEnv = path.join(backendDir, ".env");
  const rootEnv = path.join(tmp, ".env");

  fs.writeFileSync(backendEnv, "DATABASE_URL=postgresql://host-user:host-pass@127.0.0.1:5432/local_engine\n");
  fs.writeFileSync(rootEnv, "DATABASE_URL=postgresql://docker-user:docker-pass@postgres:5432/local_engine\nGOOGLE_CLIENT_ID=test-client\nGOOGLE_CLIENT_SECRET=test-secret\n");

  const keys = ["DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "MSE_25_48_ENV_FILE", "MSE_25_40_ENV_FILE"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  try {
    for (const key of keys) delete process.env[key];
    process.env.MSE_25_48_ENV_FILE = backendEnv;

    const result = bootstrapMse2548Env();

    assert.equal(process.env.DATABASE_URL, "postgresql://host-user:host-pass@127.0.0.1:5432/local_engine");
    assert.equal(process.env.GOOGLE_CLIENT_ID, "test-client");
    assert.equal(process.env.GOOGLE_CLIENT_SECRET, "test-secret");
    assert.equal(result.googleClientConfigured, true);
    assert.deepEqual(result.loadedFiles, [backendEnv, rootEnv]);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
