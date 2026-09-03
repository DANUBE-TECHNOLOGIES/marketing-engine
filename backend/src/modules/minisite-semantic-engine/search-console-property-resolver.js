"use strict";

const SEARCH_CONSOLE_SITES_ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites";

function normalizeHost(value) {
  return String(value || "").trim().toLowerCase().replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function chooseSearchConsoleProperty(properties = [], { preferredHost = process.env.SEARCH_CONSOLE_PREFERRED_HOST || "agences.mondescale.com" } = {}) {
  const rows = (properties || []).filter((row) => row && row.siteUrl);
  const exactDomain = rows.find((row) => String(row.siteUrl).toLowerCase() === `sc-domain:${preferredHost.toLowerCase()}`);
  if (exactDomain) return exactDomain;

  const exactPrefix = rows.find((row) => normalizeHost(row.siteUrl) === preferredHost.toLowerCase());
  if (exactPrefix) return exactPrefix;

  const mondescale = rows.filter((row) => /mondescale\.com/i.test(String(row.siteUrl || "")));
  if (mondescale.length === 1) return mondescale[0];
  return null;
}

async function fetchAccessibleSearchConsoleProperties({ accessToken, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(SEARCH_CONSOLE_SITES_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Search Console HTTP ${response.status}`);
    error.code = "MSE_25_SEARCH_CONSOLE_PROPERTY_DISCOVERY_FAILED";
    error.details = payload?.error || payload || {};
    throw error;
  }
  return (payload?.siteEntry || []).map((entry) => ({
    siteUrl: entry.siteUrl,
    permissionLevel: entry.permissionLevel,
  }));
}

async function resolveSearchConsoleSiteUrl({
  accessToken,
  explicitSiteUrl = process.env.SEARCH_CONSOLE_SITE_URL,
  preferredHost = process.env.SEARCH_CONSOLE_PREFERRED_HOST || "agences.mondescale.com",
  fetchImpl = fetch,
} = {}) {
  const explicit = String(explicitSiteUrl || "").trim();
  if (explicit) return { siteUrl: explicit, source: "env", properties: [] };

  const properties = await fetchAccessibleSearchConsoleProperties({ accessToken, fetchImpl });
  const selected = chooseSearchConsoleProperty(properties, { preferredHost });
  if (!selected) {
    const error = new Error(`No unambiguous Search Console property found for ${preferredHost}.`);
    error.code = "MSE_25_SEARCH_CONSOLE_PROPERTY_NOT_RESOLVED";
    error.details = { preferredHost, accessibleProperties: properties };
    throw error;
  }

  process.env.SEARCH_CONSOLE_SITE_URL = selected.siteUrl;
  return { siteUrl: selected.siteUrl, source: "discovered", permissionLevel: selected.permissionLevel || null, properties };
}

module.exports = {
  SEARCH_CONSOLE_SITES_ENDPOINT,
  normalizeHost,
  chooseSearchConsoleProperty,
  fetchAccessibleSearchConsoleProperties,
  resolveSearchConsoleSiteUrl,
};
