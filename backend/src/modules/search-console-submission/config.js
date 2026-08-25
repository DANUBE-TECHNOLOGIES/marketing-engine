"use strict";

const {
  createGoogleAccessTokenProvider,
  createStoredSearchConsoleAccessTokenProvider,
  googleAuthLibraryStatus,
} = require("./auth");
const { DisabledSearchConsoleProvider, GoogleSearchConsoleProvider } = require("./provider");

function enabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function disabledProvider(reason, requestedEnabled = false) {
  const provider = new DisabledSearchConsoleProvider();
  provider.disabledReason = reason;
  provider.requestedEnabled = requestedEnabled;
  provider.credentialMode = null;
  provider.accessMode = "none";
  provider.submissionCapable = false;
  return provider;
}

function createConfiguredSearchConsoleProvider({
  env = process.env,
  prisma,
  GoogleAuth,
  fetchImpl,
  moduleLoader,
} = {}) {
  if (!enabled(env.SEARCH_CONSOLE_ENABLED)) {
    return disabledProvider("feature-disabled", false);
  }

  const authMode = String(
    env.SEARCH_CONSOLE_AUTH_MODE || (prisma ? "oauth-db-token" : "application-default")
  ).trim().toLowerCase();

  let accessTokenProvider;
  let credentialMode;

  if (authMode === "oauth-db-token") {
    if (!prisma) {
      return disabledProvider("oauth-token-store-unavailable", true);
    }
    accessTokenProvider = createStoredSearchConsoleAccessTokenProvider({
      prisma,
      env,
      fetchImpl,
    });
    credentialMode = "oauth-db-token";
  } else if (authMode === "application-default") {
    if (!GoogleAuth) {
      const dependency = googleAuthLibraryStatus(moduleLoader || require);
      if (!dependency.available) {
        return disabledProvider(dependency.reason || "google-auth-library-missing", true);
      }
    }

    const credentialsPath = String(env.GOOGLE_APPLICATION_CREDENTIALS || "").trim() || undefined;
    accessTokenProvider = createGoogleAccessTokenProvider({
      GoogleAuth,
      keyFile: credentialsPath,
    });
    credentialMode = credentialsPath ? "key-file" : "application-default-credentials";
  } else {
    return disabledProvider("unsupported-auth-mode", true);
  }

  const provider = new GoogleSearchConsoleProvider({ accessTokenProvider, fetchImpl });
  provider.requestedEnabled = true;
  provider.disabledReason = null;
  provider.credentialMode = credentialMode;
  provider.accessMode = credentialMode === "oauth-db-token" ? "read-only" : "configured-scope";
  provider.submissionCapable = credentialMode !== "oauth-db-token";
  return provider;
}

module.exports = {
  createConfiguredSearchConsoleProvider,
  disabledProvider,
  enabled,
};
