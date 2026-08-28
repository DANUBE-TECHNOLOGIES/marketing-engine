"use strict";

const { createConfiguredSearchConsoleProvider } = require("./config");
const { getSearchConsoleTokenReadiness } = require("../minisite-semantic-engine/search-console-token-provider");

async function searchConsoleProviderReadiness({ prisma } = {}) {
  try {
    const readiness = await getSearchConsoleTokenReadiness({ prisma });
    return {
      configured: Boolean(
        readiness?.envAccessTokenConfigured ||
        (readiness?.searchConsoleTokenConfigured && readiness?.googleClientConfigured)
      ),
      ...readiness,
      error: null,
    };
  } catch (error) {
    return {
      configured: false,
      provider: "search-console",
      error: error?.message || String(error),
    };
  }
}

function createSearchConsoleProvider({ prisma, fetchImpl = globalThis.fetch, env = process.env } = {}) {
  return createConfiguredSearchConsoleProvider({ prisma, fetchImpl, env });
}

module.exports = {
  createSearchConsoleProvider,
  searchConsoleProviderReadiness,
};
