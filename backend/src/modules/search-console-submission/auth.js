"use strict";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters";

function googleAuthLibraryStatus(loader = require) {
  try {
    const library = loader("google-auth-library");
    return {
      available: typeof library?.GoogleAuth === "function",
      reason: typeof library?.GoogleAuth === "function" ? null : "google-auth-constructor-missing",
    };
  } catch (_error) {
    return {
      available: false,
      reason: "google-auth-library-missing",
    };
  }
}

function resolveGoogleAuthConstructor(explicitConstructor) {
  if (explicitConstructor) return explicitConstructor;
  try {
    return require("google-auth-library").GoogleAuth;
  } catch (error) {
    const wrapped = new Error("google-auth-library est requis pour activer l’authentification Search Console.");
    wrapped.code = "SEARCH_CONSOLE_GOOGLE_AUTH_LIBRARY_MISSING";
    wrapped.statusCode = 503;
    wrapped.cause = error;
    throw wrapped;
  }
}

function createGoogleAccessTokenProvider({ GoogleAuth, credentials, keyFile, scopes = [SEARCH_CONSOLE_SCOPE] } = {}) {
  let authClientPromise = null;

  return async function googleAccessTokenProvider() {
    const GoogleAuthCtor = resolveGoogleAuthConstructor(GoogleAuth);
    if (!authClientPromise) {
      const auth = new GoogleAuthCtor({
        scopes,
        ...(credentials ? { credentials } : {}),
        ...(keyFile ? { keyFile } : {}),
      });
      authClientPromise = auth.getClient();
    }

    const client = await authClientPromise;
    const tokenResult = await client.getAccessToken();
    const token = typeof tokenResult === "string" ? tokenResult : tokenResult?.token;
    const normalized = String(token || "").trim();
    if (!normalized) {
      const error = new Error("Google Auth n’a retourné aucun jeton OAuth Search Console.");
      error.code = "SEARCH_CONSOLE_ACCESS_TOKEN_UNAVAILABLE";
      error.statusCode = 503;
      throw error;
    }
    return normalized;
  };
}

module.exports = {
  SEARCH_CONSOLE_SCOPE,
  createGoogleAccessTokenProvider,
  googleAuthLibraryStatus,
  resolveGoogleAuthConstructor,
};