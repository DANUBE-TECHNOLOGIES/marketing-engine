"use strict";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SEARCH_CONSOLE_PROVIDER = "search-console";
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

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

function createPersistentOAuthAccessTokenProvider({ prisma, env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  if (!prisma?.googleToken) throw new Error("Prisma googleToken est requis pour le provider OAuth Search Console persistant.");

  return async function persistentSearchConsoleAccessTokenProvider() {
    const token = await prisma.googleToken.findFirst({
      where: { provider: SEARCH_CONSOLE_PROVIDER },
      orderBy: { createdAt: "desc" },
    });

    if (!token?.refreshToken) {
      const error = new Error("Aucun refresh token OAuth Search Console persistant n’est disponible.");
      error.code = "SEARCH_CONSOLE_REFRESH_TOKEN_UNAVAILABLE";
      error.statusCode = 503;
      throw error;
    }

    const expiry = token.expiryDate ? Number(token.expiryDate) : 0;
    const accessToken = String(token.accessToken || "").trim();
    if (accessToken && expiry > Number(now()) + TOKEN_REFRESH_SKEW_MS) return accessToken;

    const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
    const clientSecret = String(env.GOOGLE_CLIENT_SECRET || "").trim();
    if (!clientId || !clientSecret) {
      const error = new Error("GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquant pour rafraîchir Search Console.");
      error.code = "SEARCH_CONSOLE_OAUTH_CLIENT_NOT_CONFIGURED";
      error.statusCode = 503;
      throw error;
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: String(token.refreshToken),
      grant_type: "refresh_token",
    });
    const response = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await response.json();
    if (!response.ok || !data?.access_token) {
      const error = new Error("Impossible de rafraîchir le jeton OAuth Search Console persistant.");
      error.code = "SEARCH_CONSOLE_TOKEN_REFRESH_FAILED";
      error.statusCode = Number(response.status || 503);
      error.details = data || null;
      throw error;
    }

    const expiryDate = BigInt(Number(now()) + Number(data.expires_in || 3600) * 1000);
    await prisma.googleToken.update({
      where: { id: token.id },
      data: { accessToken: data.access_token, expiryDate },
    });
    return String(data.access_token);
  };
}

module.exports = {
  SEARCH_CONSOLE_SCOPE,
  SEARCH_CONSOLE_PROVIDER,
  TOKEN_REFRESH_SKEW_MS,
  createGoogleAccessTokenProvider,
  createPersistentOAuthAccessTokenProvider,
  googleAuthLibraryStatus,
  resolveGoogleAuthConstructor,
};