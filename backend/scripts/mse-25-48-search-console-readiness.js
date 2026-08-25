#!/usr/bin/env node
"use strict";

const path = require("node:path");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const { getSearchConsoleTokenReadiness } = require("../src/modules/minisite-semantic-engine/search-console-token-provider");

function bootstrapEnv() {
  const envFile = process.env.MSE_25_48_ENV_FILE || process.env.MSE_25_40_ENV_FILE;
  if (envFile) dotenv.config({ path: path.resolve(envFile) });
}

async function run({ prisma } = {}) {
  bootstrapEnv();
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

module.exports = { bootstrapEnv, run };
