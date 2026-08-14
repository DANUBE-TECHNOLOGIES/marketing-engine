"use strict";

const { createGoogleAccessTokenProvider } = require("./auth");
const { DisabledSearchConsoleProvider, GoogleSearchConsoleProvider } = require("./provider");

function enabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function createConfiguredSearchConsoleProvider({ env = process.env, GoogleAuth, fetchImpl } = {}) {
  if (!enabled(env.SEARCH_CONSOLE_ENABLED)) return new DisabledSearchConsoleProvider();

  const credentialsPath = String(env.GOOGLE_APPLICATION_CREDENTIALS || "").trim() || undefined;
  const accessTokenProvider = createGoogleAccessTokenProvider({
    GoogleAuth,
    keyFile: credentialsPath,
  });

  return new GoogleSearchConsoleProvider({ accessTokenProvider, fetchImpl });
}

module.exports = {
  createConfiguredSearchConsoleProvider,
  enabled,
};