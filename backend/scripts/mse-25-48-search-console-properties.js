#!/usr/bin/env node
"use strict";

const path = require("node:path");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const { getSearchConsoleAccessToken } = require("../src/modules/minisite-semantic-engine/search-console-token-provider");

function bootstrapEnv() {
  const envFile = process.env.MSE_25_48_ENV_FILE || process.env.MSE_25_40_ENV_FILE;
  if (envFile) dotenv.config({ path: path.resolve(envFile) });
}

async function fetchProperties({ accessToken, fetchImpl = fetch } = {}) {
  const response = await fetchImpl("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Search Console HTTP ${response.status}`);
    error.code = "MSE_25_48_SEARCH_CONSOLE_PROPERTIES_FAILED";
    error.details = payload?.error || payload || {};
    throw error;
  }
  return (payload?.siteEntry || []).map((entry) => ({ siteUrl: entry.siteUrl, permissionLevel: entry.permissionLevel }));
}

async function run({ prisma } = {}) {
  bootstrapEnv();
  const client = prisma || new PrismaClient();
  try {
    const token = await getSearchConsoleAccessToken({ prisma: client });
    const properties = await fetchProperties({ accessToken: token.accessToken });
    const preferred = properties.find((p) => /(?:sc-domain:)?mondescale\.com/i.test(String(p.siteUrl || ""))) || null;
    const result = { ok: true, readOnly: true, writes: false, tokenSource: token.source, propertyCount: properties.length, preferredProperty: preferred, properties };
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    if (!prisma) await client.$disconnect();
  }
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_48_SEARCH_CONSOLE_PROPERTIES_FAILED", message: error.message, details: error.details || {} }, null, 2));
  process.exitCode = 1;
});

module.exports = { bootstrapEnv, fetchProperties, run };
