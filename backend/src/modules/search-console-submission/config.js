"use strict";

const {
  createGoogleAccessTokenProvider,
  createPersistentOAuthAccessTokenProvider,
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
  return provider;
}

function createConfiguredSearchConsoleProvider({ env = process.env, prisma, GoogleAuth, fetchImpl, moduleLoader } = {}) {
  if (!enabled(env.SEARCH_CONSOLE_ENABLED)) {
    return disabledProvider("feature-disabled", false);
  }

  if (prisma?.googleToken) {
    const provider = new GoogleSearchConsoleProvider({
      accessTokenProvider: createPersistentOAuthAccessTokenProvider({ prisma, env, fetchImpl }),
      fetchImpl,
    });
    provider.requestedEnabled = true;
    provider.disabledReason = null;
    provider.credentialMode = "persistent-oauth-token";
    return provider;
  }

  if (!GoogleAuth) {
    const dependency = googleAuthLibraryStatus(moduleLoader || require);
    if (!dependency.available) {
      return disabledProvider(dependency.reason || "google-auth-library-missing", true);
    }
  }

  const credentialsPath = String(env.GOOGLE_APPLICATION_CREDENTIALS || "").trim() || undefined;
  const accessTokenProvider = createGoogleAccessTokenProvider({
    GoogleAuth,
    keyFile: credentialsPath,
  });

  const provider = new GoogleSearchConsoleProvider({ accessTokenProvider, fetchImpl });
  provider.requestedEnabled = true;
  provider.disabledReason = null;
  provider.credentialMode = credentialsPath ? "key-file" : "application-default-credentials";
  return provider;
}

module.exports = {
  createConfiguredSearchConsoleProvider,
  disabledProvider,
  enabled,
};