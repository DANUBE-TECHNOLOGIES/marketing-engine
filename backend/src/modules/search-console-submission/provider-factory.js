"use strict";

const { GoogleSearchConsoleProvider, DisabledSearchConsoleProvider } = require("./provider");
const { getSearchConsoleAccessToken, getSearchConsoleTokenReadiness } = require("../minisite-semantic-engine/search-console-token-provider");

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

function createSearchConsoleProvider({ prisma, fetchImpl = globalThis.fetch } = {}) {
  if (!prisma) return new DisabledSearchConsoleProvider();
  return new GoogleSearchConsoleProvider({
    fetchImpl,
    accessTokenProvider: async () => {
      const token = await getSearchConsoleAccessToken({ prisma, fetchImpl });
      return token.accessToken;
    },
  });
}

module.exports = {
  createSearchConsoleProvider,
  searchConsoleProviderReadiness,
};
