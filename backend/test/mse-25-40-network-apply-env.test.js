"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadMseEnvironment, persistenceServiceForTenant } = require("../scripts/mse-25-40-network-apply");

test("real rollout env bootstrap loads DATABASE_URL from MSE_25_40_ENV_FILE", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-40-env-"));
  const envFile = path.join(directory, ".env");
  const previous = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    fs.writeFileSync(envFile, "DATABASE_URL=postgresql://example:example@127.0.0.1:5432/example\n", "utf8");
    const result = loadMseEnvironment(envFile);
    assert.equal(result.databaseUrlLoaded, true);
    assert.equal(process.env.DATABASE_URL, "postgresql://example:example@127.0.0.1:5432/example");
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("env bootstrap fails closed when DATABASE_URL is still absent", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-40-env-"));
  const envFile = path.join(directory, ".env");
  const previous = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    fs.writeFileSync(envFile, "OTHER_VALUE=1\n", "utf8");
    assert.throws(
      () => loadMseEnvironment(envFile),
      (error) => error.code === "MSE_25_40_DATABASE_URL_MISSING"
    );
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("injected prisma bypasses env bootstrap and remains testable", async () => {
  const prisma = {
    tenant: {
      findUnique: async ({ where }) => where.slug === "mondescale" ? { id: 42 } : null,
    },
  };
  const result = await persistenceServiceForTenant("mondescale", { prisma });
  assert.equal(result.tenantId, 42);
  assert.equal(result.ownsPrisma, false);
  assert.equal(result.prisma, prisma);
});
