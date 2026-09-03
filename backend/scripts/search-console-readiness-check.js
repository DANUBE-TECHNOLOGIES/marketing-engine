"use strict";

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:4000";

function required(name, value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    const error = new Error(`${name} est obligatoire.`);
    error.code = "SEARCH_CONSOLE_OPERATOR_ARGUMENT_REQUIRED";
    throw error;
  }
  return normalized;
}

function normalizeOrigin(value) {
  return String(value || DEFAULT_BACKEND_ORIGIN).trim().replace(/\/+$/g, "");
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let payload = null;
  try { payload = await response.json(); } catch (_error) { payload = null; }

  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.code = payload?.error || "SEARCH_CONSOLE_OPERATOR_HTTP_ERROR";
    error.statusCode = response.status;
    error.details = payload?.details || payload || {};
    throw error;
  }
  return payload;
}

async function run({ backendOrigin, tenantSlug, siteSlug, siteUrl } = {}) {
  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const tenant = required("TENANT_SLUG", tenantSlug || process.env.TENANT_SLUG || "mondescale");
  const slug = required("SITE_SLUG", siteSlug || process.env.SITE_SLUG);
  const property = required("SEARCH_CONSOLE_SITE_URL", siteUrl || process.env.SEARCH_CONSOLE_SITE_URL);
  const headers = { "x-tenant-slug": tenant };

  const health = await jsonRequest(`${origin}/search-console-submissions/health`, { headers });
  if (!health.providerConfigured) {
    const error = new Error(`Provider Search Console indisponible (${health.configurationState || health.provider || "unknown"}).`);
    error.code = "SEARCH_CONSOLE_PROVIDER_NOT_READY";
    error.details = health;
    throw error;
  }

  const properties = await jsonRequest(`${origin}/search-console-submissions/properties`, { headers });
  const propertyEntry = (properties.properties || []).find((item) => String(item?.siteUrl || "").trim() === property);
  if (!propertyEntry) {
    const error = new Error(`Propriété Search Console inaccessible : ${property}`);
    error.code = "SEARCH_CONSOLE_SITE_NOT_ACCESSIBLE";
    throw error;
  }
  if (String(propertyEntry.permissionLevel || "").trim() !== "siteOwner") {
    const error = new Error(`La propriété Search Console n’a pas le niveau siteOwner : ${property}`);
    error.code = "SEARCH_CONSOLE_SITE_OWNER_REQUIRED";
    error.details = { permissionLevel: propertyEntry.permissionLevel || null };
    throw error;
  }

  const preflight = await jsonRequest(`${origin}/search-console-submissions/preflight`, {
    method: "POST",
    headers,
    body: JSON.stringify({ siteSlug: slug, siteUrl: property }),
  });

  const result = {
    ok: preflight?.ok === true,
    tenantSlug: tenant,
    siteSlug: slug,
    siteUrl: property,
    sitemapUrl: preflight?.sitemapUrl || null,
    entryCount: preflight?.entryCount || null,
    checks: preflight?.checks || [],
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "SEARCH_CONSOLE_OPERATOR_CHECK_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { run, jsonRequest, normalizeOrigin };
