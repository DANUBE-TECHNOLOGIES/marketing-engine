"use strict";

/**
 * MSE-25.82 — production indexation safety gate.
 *
 * This script is deliberately read-only:
 * - GET only against Local Engine / Search Console observability routes;
 * - no prepare / approve / submit route;
 * - no sitemap submission;
 * - no CMS or database mutation.
 */

const BACKEND_ORIGIN = String(
  process.env.BACKEND_INTERNAL_URL ||
    process.env.MINISITE_BACKEND_INTERNAL_URL ||
    "http://127.0.0.1:4000"
).replace(/\/+$/g, "");

const PUBLIC_ORIGIN = String(
  process.env.PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
).replace(/\/+$/g, "");

const TENANT_SLUG = String(
  process.env.TENANT_SLUG || process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale"
).trim();

const SEARCH_CONSOLE_SITE_URL = String(
  process.env.SEARCH_CONSOLE_SITE_URL || "sc-domain:mondescale.com"
).trim();

const EXPECTED_SITEMAP_COUNT = Number.parseInt(
  process.env.MSE_25_82_EXPECTED_SITEMAP_COUNT || "0",
  10
);

const TIMEOUT_MS = Math.max(
  1000,
  Number.parseInt(process.env.MSE_25_82_TIMEOUT_MS || "12000", 10) || 12000
);

function fail(message, details) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function request(pathname, { publicRequest = false, accept = "application/json" } = {}) {
  const origin = publicRequest ? PUBLIC_ORIGIN : BACKEND_ORIGIN;
  const headers = { Accept: accept };
  if (!publicRequest) headers["x-tenant-slug"] = TENANT_SLUG;

  const response = await fetch(`${origin}${pathname}`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await response.text();
  if (!response.ok) {
    fail(`GET ${pathname} failed with HTTP ${response.status}`, text.slice(0, 800));
  }

  if (accept.includes("json")) {
    try {
      return JSON.parse(text);
    } catch (_error) {
      fail(`GET ${pathname} returned invalid JSON`, text.slice(0, 800));
    }
  }

  return text;
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function countXmlUrls(xml) {
  return (String(xml || "").match(/<url(?:\s|>)/g) || []).length;
}

function unique(values) {
  return [...new Set(values)];
}

async function main() {
  const [health, properties, sitemapPayload, publicSitemap] = await Promise.all([
    request("/search-console-submissions/health"),
    request("/search-console-submissions/properties"),
    request("/minisite-structured-data/sitemap"),
    request("/sitemap.xml", { publicRequest: true, accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" }),
  ]);

  assert(health?.ok === true, "Search Console health is not OK", health);
  assert(
    health?.provider === "google-search-console",
    "Unexpected Search Console provider",
    health?.provider
  );
  assert(
    health?.credentialMode === "persistent-oauth-token",
    "Search Console is not using persistent OAuth credentials",
    health?.credentialMode
  );
  assert(health?.providerConfigured === true, "Search Console provider is not configured", health);
  assert(
    health?.providerTransportConfigured === true,
    "Search Console transport is not configured",
    health
  );
  assert(
    health?.explicitApprovalRequired === true,
    "Explicit Search Console approval guard is not enabled",
    health
  );
  assert(health?.autoSubmit === false, "Automatic sitemap submission must stay disabled", health);
  assert(
    health?.readOnlySitemapObservability === true &&
      health?.readOnlySearchPerformance === true &&
      health?.readOnlyIndexationCoverage === true &&
      health?.readOnlyPublicHttpIndexability === true &&
      health?.readOnlyRuntimeReadiness === true,
    "One or more read-only observability invariants are missing",
    health
  );

  const ownerProperty = (properties?.properties || []).find(
    (property) => property?.siteUrl === SEARCH_CONSOLE_SITE_URL
  );
  assert(ownerProperty, "Expected Search Console property is missing", properties);
  assert(
    ownerProperty?.permissionLevel === "siteOwner",
    "Search Console property is not siteOwner",
    ownerProperty
  );
  assert(
    ownerProperty?.eligibleForSitemapSubmission === true,
    "Search Console property is not eligible for guarded sitemap submission",
    ownerProperty
  );

  const entries = Array.isArray(sitemapPayload?.entries) ? sitemapPayload.entries : [];
  assert(entries.length > 0, "Backend sitemap is empty", sitemapPayload?.summary);

  const urls = entries.map((entry) => String(entry?.url || "").trim()).filter(Boolean);
  assert(urls.length === entries.length, "Backend sitemap contains an entry without URL");
  assert(unique(urls).length === urls.length, "Backend sitemap contains duplicate URLs");
  assert(
    urls.every((url) => url.startsWith(`${PUBLIC_ORIGIN}/agence/`)),
    "Backend sitemap contains a non-canonical public origin or path",
    urls.filter((url) => !url.startsWith(`${PUBLIC_ORIGIN}/agence/`)).slice(0, 10)
  );

  const publicUrlCount = countXmlUrls(publicSitemap);
  assert(publicUrlCount > 0, "Public sitemap.xml is empty");
  assert(
    publicUrlCount === entries.length,
    "Public sitemap count differs from backend sitemap count",
    { backend: entries.length, public: publicUrlCount }
  );

  if (Number.isFinite(EXPECTED_SITEMAP_COUNT) && EXPECTED_SITEMAP_COUNT > 0) {
    assert(
      publicUrlCount === EXPECTED_SITEMAP_COUNT,
      "Public sitemap count differs from the release expectation",
      { expected: EXPECTED_SITEMAP_COUNT, actual: publicUrlCount }
    );
  }

  const readiness = sitemapPayload?.indexationReadiness || {};
  assert(
    Number(readiness?.siteCount || 0) > 0,
    "No published site participates in indexation readiness",
    readiness
  );
  assert(
    Number(readiness?.blockedSites || 0) === 0,
    "At least one published site is technically blocked from indexation",
    readiness?.sites
  );
  assert(
    readiness?.readyToSubmit === true,
    "Network technical indexation readiness is false",
    readiness
  );

  console.log("================================================");
  console.log("=== MSE-25.82 - READ ONLY PRODUCTION GATE =====");
  console.log("================================================");
  console.log(`BACKEND=${BACKEND_ORIGIN}`);
  console.log(`PUBLIC=${PUBLIC_ORIGIN}`);
  console.log(`TENANT=${TENANT_SLUG}`);
  console.log(`SEARCH_CONSOLE_PROVIDER=${health.provider}`);
  console.log(`CREDENTIAL_MODE=${health.credentialMode}`);
  console.log(`PROPERTY=${ownerProperty.siteUrl}`);
  console.log(`PERMISSION=${ownerProperty.permissionLevel}`);
  console.log(`SITEMAP=${publicUrlCount}`);
  console.log(`INDEXATION_READY_SITES=${readiness.readySites}/${readiness.siteCount}`);
  console.log("EXPLICIT_APPROVAL_REQUIRED=YES");
  console.log("AUTO_SUBMIT=NO");
  console.log("GOOGLE_WRITES=0");
  console.log("CMS_WRITES=0");
  console.log("MSE-25.82=PASS");
}

main().catch((error) => {
  console.error("================================================");
  console.error("=== MSE-25.82 - FAIL ==========================");
  console.error("================================================");
  console.error(error?.message || error);
  if (error?.details !== undefined) {
    console.error(
      typeof error.details === "string"
        ? error.details
        : JSON.stringify(error.details, null, 2)
    );
  }
  process.exitCode = 1;
});
