#!/usr/bin/env node
"use strict";

const DEFAULTS = Object.freeze({
  backendBaseUrl: process.env.MSE25_BACKEND_BASE_URL || "http://127.0.0.1:4000",
  frontendBaseUrl: process.env.MSE25_FRONTEND_BASE_URL || "http://127.0.0.1:3000",
  publicOrigin: process.env.MSE25_PUBLIC_ORIGIN || "https://agences.mondescale.com",
  tenantSlug: process.env.TENANT_SLUG || "mondescale",
  siteUrl: process.env.SEARCH_CONSOLE_SITE_URL || "sc-domain:mondescale.com",
  pagePrefix: process.env.SEARCH_CONSOLE_PAGE_PREFIX || "https://agences.mondescale.com/",
  expectedSitemapUrls: Number(process.env.MSE25_EXPECTED_SITEMAP_URLS || 115),
  expectedDestinationUrls: Number(process.env.MSE25_EXPECTED_DESTINATION_URLS || 42),
  timeoutMs: Number(process.env.MSE25_ACCEPTANCE_TIMEOUT_MS || 30000),
});

function trimSlash(value) {
  return String(value || "").replace(/\/+$/g, "");
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function request(fetchImpl, url, { timeoutMs, headers } = {}) {
  const timer = withTimeout(timeoutMs || DEFAULTS.timeoutMs);
  try {
    const response = await fetchImpl(url, { redirect: "follow", signal: timer.signal, headers });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_error) {}
    return { ok: response.ok, status: response.status, url: response.url || url, text, json, error: null };
  } catch (error) {
    return { ok: false, status: null, url, text: "", json: null, error: error?.name === "AbortError" ? "timeout" : String(error?.message || error) };
  } finally {
    timer.done();
  }
}

function sitemapUrls(xml) {
  return [...String(xml || "").matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

function destinationUrls(urls) {
  return urls.filter((url) => /\/destination\//.test(url));
}

function readinessSummary(json) {
  const summary = json?.summary || {};
  return {
    verdict: json?.verdict || null,
    readyForGoogleDiscovery: json?.readyForGoogleDiscovery === true,
    blockers: Array.isArray(json?.blockers) ? json.blockers : [],
    warnings: Array.isArray(json?.warnings) ? json.warnings : [],
    publicIssueCount: Number(summary.publicIssueCount || 0),
    httpErrorCount: Number(summary.httpErrorCount || 0),
    reachablePageCount: Number(summary.reachablePageCount || 0),
    auditedPageCount: Number(summary.auditedPageCount || 0),
    googleDataState: summary.googleDataState || null,
    analyticsRowCount: Number(summary.analyticsRowCount || 0),
  };
}

function evaluate(result, expected = DEFAULTS) {
  const blockers = [];
  const warnings = [];
  if (result.frontendHealth.status !== 200) blockers.push("FRONTEND_HEALTH_FAILED");
  if (result.localSitemap.status !== 200) blockers.push("LOCAL_SITEMAP_FAILED");
  if (result.localSitemap.urlCount !== expected.expectedSitemapUrls) blockers.push("SITEMAP_URL_COUNT_MISMATCH");
  if (result.localSitemap.destinationUrlCount !== expected.expectedDestinationUrls) blockers.push("DESTINATION_URL_COUNT_MISMATCH");
  if (result.backendHealth.status !== 200) blockers.push("BACKEND_HEALTH_FAILED");
  if (result.runtimeReadiness.status !== 200) blockers.push("RUNTIME_READINESS_FAILED");
  if (result.runtimeReadiness.summary?.readyForGoogleDiscovery !== true) blockers.push("INDEXABILITY_NOT_READY");
  if ((result.runtimeReadiness.summary?.publicIssueCount || 0) > 0) blockers.push("PUBLIC_INDEXABILITY_ISSUES");
  if (result.searchConsoleHealth.status !== 200 || result.searchConsoleHealth.provider !== "google-search-console") blockers.push("SEARCH_CONSOLE_PROVIDER_NOT_READY");
  if (result.properties.status !== 200) blockers.push("SEARCH_CONSOLE_PROPERTIES_FAILED");
  if (!result.properties.hasExpectedProperty) blockers.push("SEARCH_CONSOLE_PROPERTY_MISSING");
  if (result.publicSitemap.status !== 200) warnings.push("PUBLIC_EDGE_UNAVAILABLE");
  if (result.publicRoot.status !== 200 && result.publicRoot.status !== 401) warnings.push("PUBLIC_ROOT_UNAVAILABLE");
  if (result.runtimeReadiness.summary?.googleDataState === "NO_DATA_YET") warnings.push("WAITING_FOR_SEARCH_CONSOLE_DATA");
  return {
    verdict: blockers.length ? "POST_CONVERGENCE_BLOCKED" : (warnings.includes("PUBLIC_EDGE_UNAVAILABLE") ? "CORE_READY_EDGE_DEGRADED" : "POST_CONVERGENCE_READY"),
    ready: blockers.length === 0,
    blockers,
    warnings,
  };
}

async function runAcceptance({ fetchImpl = globalThis.fetch, config = DEFAULTS } = {}) {
  const backend = trimSlash(config.backendBaseUrl);
  const frontend = trimSlash(config.frontendBaseUrl);
  const publicOrigin = trimSlash(config.publicOrigin);
  const tenantHeaders = { "x-tenant-slug": config.tenantSlug };

  const [frontendHealth, localSitemap, backendHealth, searchConsoleHealth, properties, runtimeReadiness, publicRoot, publicSitemap] = await Promise.all([
    request(fetchImpl, `${frontend}/healthz`, { timeoutMs: config.timeoutMs }),
    request(fetchImpl, `${frontend}/sitemap.xml`, { timeoutMs: config.timeoutMs }),
    request(fetchImpl, `${backend}/health`, { timeoutMs: config.timeoutMs }),
    request(fetchImpl, `${backend}/search-console-submissions/health`, { timeoutMs: config.timeoutMs }),
    request(fetchImpl, `${backend}/search-console-submissions/properties`, { timeoutMs: config.timeoutMs }),
    request(fetchImpl, `${backend}/search-console-submissions/runtime-readiness`, { timeoutMs: Math.max(config.timeoutMs, 300000) }),
    request(fetchImpl, `${publicOrigin}/`, { timeoutMs: config.timeoutMs }),
    request(fetchImpl, `${publicOrigin}/sitemap.xml`, { timeoutMs: config.timeoutMs }),
  ]);

  const localUrls = sitemapUrls(localSitemap.text);
  const propertyRows = Array.isArray(properties.json?.properties) ? properties.json.properties : [];
  const result = {
    version: "mse-25.83",
    frontendHealth: { status: frontendHealth.status, ok: frontendHealth.ok, error: frontendHealth.error },
    localSitemap: { status: localSitemap.status, ok: localSitemap.ok, error: localSitemap.error, urlCount: localUrls.length, destinationUrlCount: destinationUrls(localUrls).length },
    backendHealth: { status: backendHealth.status, ok: backendHealth.ok, error: backendHealth.error },
    searchConsoleHealth: { status: searchConsoleHealth.status, provider: searchConsoleHealth.json?.provider || null, providerTransportConfigured: searchConsoleHealth.json?.providerTransportConfigured === true, error: searchConsoleHealth.error },
    properties: { status: properties.status, count: propertyRows.length, hasExpectedProperty: propertyRows.some((row) => row?.siteUrl === config.siteUrl), error: properties.error },
    runtimeReadiness: { status: runtimeReadiness.status, summary: readinessSummary(runtimeReadiness.json), error: runtimeReadiness.error },
    publicRoot: { status: publicRoot.status, ok: publicRoot.ok, error: publicRoot.error },
    publicSitemap: { status: publicSitemap.status, ok: publicSitemap.ok, error: publicSitemap.error },
    invariants: { readOnly: true, googleWrites: false, sitemapSubmission: false, pageMutation: false, websiteDesignerMutation: false },
    checkedAt: new Date().toISOString(),
  };
  return { ...result, ...evaluate(result, config) };
}

if (require.main === module) {
  runAcceptance().then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ready ? 0 : 2;
  }).catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 3;
  });
}

module.exports = { DEFAULTS, destinationUrls, evaluate, readinessSummary, request, runAcceptance, sitemapUrls, trimSlash };
