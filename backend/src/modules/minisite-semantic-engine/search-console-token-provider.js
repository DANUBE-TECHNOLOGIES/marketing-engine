"use strict";

const PROVIDER = "search-console";

function required(name, value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    const error = new Error(`${name} is required.`);
    error.code = "MSE_25_48_SEARCH_CONSOLE_CONFIG_REQUIRED";
    throw error;
  }
  return normalized;
}

async function refreshStoredAccessToken({ prisma, fetchImpl = fetch, clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET } = {}) {
  if (!prisma) throw new Error("Prisma client is required.");
  const token = await prisma.googleToken.findFirst({ where: { provider: PROVIDER }, orderBy: { createdAt: "desc" } });
  if (!token?.refreshToken) {
    const error = new Error("Aucun refresh token Search Console persistant n'est disponible.");
    error.code = "MSE_25_48_SEARCH_CONSOLE_AUTH_REQUIRED";
    throw error;
  }
  const body = new URLSearchParams({
    client_id: required("GOOGLE_CLIENT_ID", clientId),
    client_secret: required("GOOGLE_CLIENT_SECRET", clientSecret),
    refresh_token: token.refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = null; }
  if (!response.ok || !payload?.access_token) {
    const error = new Error(payload?.error_description || payload?.error || `OAuth HTTP ${response.status}`);
    error.code = "MSE_25_48_SEARCH_CONSOLE_TOKEN_REFRESH_FAILED";
    error.details = payload || {};
    throw error;
  }
  const expiryDate = Date.now() + Number(payload.expires_in || 3600) * 1000;
  await prisma.googleToken.update({ where: { id: token.id }, data: { accessToken: payload.access_token, expiryDate: BigInt(expiryDate) } });
  return { accessToken: payload.access_token, expiryDate, provider: PROVIDER };
}

async function getSearchConsoleAccessToken({ prisma, fetchImpl = fetch, envToken = process.env.SEARCH_CONSOLE_ACCESS_TOKEN } = {}) {
  if (String(envToken || "").trim()) return { accessToken: String(envToken).trim(), source: "env", provider: PROVIDER };
  const refreshed = await refreshStoredAccessToken({ prisma, fetchImpl });
  return { ...refreshed, source: "persisted-refresh-token" };
}

async function getSearchConsoleTokenReadiness({ prisma } = {}) {
  if (!prisma) throw new Error("Prisma client is required.");
  const [searchConsoleToken, businessToken] = await Promise.all([
    prisma.googleToken.findFirst({ where: { provider: PROVIDER }, orderBy: { createdAt: "desc" } }),
    prisma.googleToken.findFirst({ where: { provider: "google" }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    provider: PROVIDER,
    searchConsoleTokenConfigured: Boolean(searchConsoleToken?.refreshToken),
    searchConsoleAccessTokenCached: Boolean(searchConsoleToken?.accessToken),
    searchConsoleExpiryDate: searchConsoleToken?.expiryDate ? String(searchConsoleToken.expiryDate) : null,
    businessTokenPreserved: Boolean(businessToken?.refreshToken),
    googleClientConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    envAccessTokenConfigured: Boolean(String(process.env.SEARCH_CONSOLE_ACCESS_TOKEN || "").trim()),
  };
}

module.exports = { PROVIDER, getSearchConsoleAccessToken, refreshStoredAccessToken, getSearchConsoleTokenReadiness };
