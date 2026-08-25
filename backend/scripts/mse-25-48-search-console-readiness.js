#!/usr/bin/env node
"use strict";

const { PrismaClient } = require("@prisma/client");
const { getSearchConsoleTokenReadiness } = require("../src/modules/minisite-semantic-engine/search-console-token-provider");
const { bootstrapMse2548Env } = require("../src/modules/minisite-semantic-engine/mse-25-48-env");

async function run({ prisma } = {}) {
  bootstrapMse2548Env();
  const client = prisma || new PrismaClient();
  try {
    const readiness = await getSearchConsoleTokenReadiness({ prisma: client });
    const result = {
      ok: true,
      readOnly: true,
      writes: false,
      scopeRequired: "https://www.googleapis.com/auth/webmasters.readonly",
      ...readiness,
      authorizationRequired: !readiness.envAccessTokenConfigured && !readiness.searchConsoleTokenConfigured,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    if (!prisma) await client.$disconnect();
  }
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_48_SEARCH_CONSOLE_READINESS_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { bootstrapEnv: bootstrapMse2548Env, run };
