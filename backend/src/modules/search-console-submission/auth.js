"use strict";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters";
const SEARCH_CONSOLE_TOKEN_PROVIDER = "search-console";
const TOKEN_REFRESH_SAFETY_MS = 60 * 1000;

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

function searchConsoleAuthError(message, code, statusCode = 503, cause) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  if (cause) error.cause = cause;
  return error;
}

function createStoredSearchConsoleAccessTokenProvider({
  prisma,
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  if (!prisma?.googleToken) {
    throw searchConsoleAuthError(
      "Le stockage OAuth Search Console est indisponible.",
      "SEARCH_CONSOLE_TOKEN_STORE_UNAVAILABLE"
    );
  }

  return async function storedSearchConsoleAccessTokenProvider() {
    const token = await prisma.googleToken.findFirst({
      where: { provider: SEARCH_CONSOLE_TOKEN_PROVIDER },
      orderBy: { createdAt: "desc" },
    });

    if (!token?.refreshToken) {
      throw searchConsoleAuthError(
        "Aucun refresh token OAuth Search Console isolé n’est enregistré.",
        "SEARCH_CONSOLE_REFRESH_TOKEN_UNAVAILABLE"
      );
    }

    const expiry = token.expiryDate == null ? 0 : Number(token.expiryDate);
    const accessToken = String(token.accessToken || "").trim();
    if (accessToken && Number.isFinite(expiry) && expiry > now() + TOKEN_REFRESH_SAFETY_MS) {
      return accessToken;
    }

    const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
    const clientSecret = String(env.GOOGLE_CLIENT_SECRET || "").trim();
    if (!clientId || !clientSecret) {
      throw searchConsoleAuthError(
        "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants pour rafraîchir Search Console.",
        "SEARCH_CONSOLE_OAUTH_CLIENT_NOT_CONFIGURED"
      );
    }
    if (typeof fetchImpl !== "function") {
      throw searchConsoleAuthError(
        "Client HTTP indisponible pour rafraîchir Search Console.",
        "SEARCH_CONSOLE_HTTP_CLIENT_UNAVAILABLE"
      );
    }

    let response;
    let payload;
    try {
      response = await fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: token.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      payload = await response.json();
    } catch (cause) {
      throw searchConsoleAuthError(
        "Échec réseau pendant le rafraîchissement OAuth Search Console.",
        "SEARCH_CONSOLE_TOKEN_REFRESH_FAILED",
        503,
        cause
      );
    }

    const refreshedAccessToken = String(payload?.access_token || "").trim();
    if (!response?.ok || !refreshedAccessToken) {
      const error = searchConsoleAuthError(
        "Google a refusé le rafraîchissement OAuth Search Console.",
        "SEARCH_CONSOLE_TOKEN_REFRESH_FAILED",
        Number(response?.status || 503)
      );
      error.details = {
        googleError: payload?.error || null,
        googleErrorDescription: payload?.error_description || null,
      };
      throw error;
    }

    const expiryDate = BigInt(now() + Number(payload?.expires_in || 3600) * 1000);
    await prisma.googleToken.update({
      where: { id: token.id },
      data: {
        accessToken: refreshedAccessToken,
        expiryDate,
      },
    });

    return refreshedAccessToken;
  };
}

module.exports = {
  SEARCH_CONSOLE_SCOPE,
  SEARCH_CONSOLE_TOKEN_PROVIDER,
  TOKEN_REFRESH_SAFETY_MS,
  createGoogleAccessTokenProvider,
  createStoredSearchConsoleAccessTokenProvider,
  googleAuthLibraryStatus,
  resolveGoogleAuthConstructor,
};
