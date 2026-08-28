#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 10000;

function normalizeBaseUrl(value) {
  const url = new URL(String(value || "https://agences.mondescale.com/agence/gien"));
  return `${url.protocol}//${url.host}`;
}

function siteSlugFromUrl(value) {
  const url = new URL(String(value || "https://agences.mondescale.com/agence/gien"));
  const parts = url.pathname.split("/").filter(Boolean);
  const agencyIndex = parts.indexOf("agence");
  return agencyIndex >= 0 && parts[agencyIndex + 1] ? parts[agencyIndex + 1] : "gien";
}

async function probe(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: "application/json,text/html;q=0.9,*/*;q=0.8" },
    });
    const body = await response.text();
    return {
      url,
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get("content-type") || "",
      server: response.headers.get("server") || "",
      contractVersion: response.headers.get("x-public-site-contract-version") || "",
      brandRuntime: response.headers.get("x-public-site-brand-runtime") || "",
      bodyPreview: body.slice(0, 400).replace(/\s+/g, " ").trim(),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      contentType: "",
      server: "",
      contractVersion: "",
      brandRuntime: "",
      bodyPreview: String(error?.message || error || "request failed").slice(0, 400),
    };
  }
}

function isReverseProxyServer(value) {
  return /(?:openresty|nginx|caddy|apache)/i.test(String(value || ""));
}

function classifyOriginChain({ liveness, publicApi, agency }) {
  if (liveness.status >= 500 && isReverseProxyServer(liveness.server)) {
    return "PUBLIC_REVERSE_PROXY_UPSTREAM_FAILURE";
  }
  if (liveness.status === 0) {
    return "PUBLIC_EDGE_UNREACHABLE";
  }
  if (liveness.status !== 200) {
    return "FRONTEND_OR_PROXY_UNAVAILABLE";
  }
  if (publicApi.status >= 500) {
    return "PUBLIC_API_UPSTREAM_FAILURE";
  }
  if (publicApi.status === 0) {
    return "PUBLIC_API_UNREACHABLE";
  }
  if (publicApi.status >= 400) {
    return "PUBLIC_API_CONTRACT_FAILURE";
  }
  if (agency.status >= 500) {
    return "AGENCY_RENDER_FAILURE";
  }
  if (agency.status === 0) {
    return "AGENCY_ROUTE_UNREACHABLE";
  }
  if (agency.status >= 400) {
    return "AGENCY_ROUTE_FAILURE";
  }
  return "PUBLIC_CHAIN_READY";
}

function remediationFor(state) {
  switch (state) {
    case "PUBLIC_REVERSE_PROXY_UPSTREAM_FAILURE":
      return "CHECK_REVERSE_PROXY_UPSTREAM_AND_FRONTEND_PORT_3000";
    case "PUBLIC_EDGE_UNREACHABLE":
      return "CHECK_PUBLIC_DNS_TLS_AND_EDGE_REACHABILITY";
    case "FRONTEND_OR_PROXY_UNAVAILABLE":
      return "RESTORE_FRONTEND_OR_REVERSE_PROXY";
    case "PUBLIC_API_UPSTREAM_FAILURE":
      return "CHECK_PUBLIC_SITE_READ_AND_BRAND_LEGAL_UPSTREAMS";
    case "PUBLIC_API_UNREACHABLE":
      return "CHECK_FRONTEND_INTERNAL_API_ROUTING";
    case "PUBLIC_API_CONTRACT_FAILURE":
      return "CHECK_PUBLIC_SITE_CONTRACT_AND_SITE_SLUG";
    case "AGENCY_RENDER_FAILURE":
      return "CHECK_SERVER_RENDER_AND_PUBLIC_DATA_DEPENDENCIES";
    case "AGENCY_ROUTE_UNREACHABLE":
      return "CHECK_PUBLIC_AGENCY_ROUTE_ROUTING";
    case "AGENCY_ROUTE_FAILURE":
      return "CHECK_AGENCY_PAGE_STATUS_AND_RENDERING";
    default:
      return "RUN_PERFORMANCE_PROBES";
  }
}

async function run({ targetUrl, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const target = String(targetUrl || process.env.TARGET_URL || "https://agences.mondescale.com/agence/gien");
  const origin = normalizeBaseUrl(target);
  const slug = siteSlugFromUrl(target);

  const urls = {
    liveness: `${origin}/healthz`,
    publicApi: `${origin}/api/public-sites/${encodeURIComponent(slug)}`,
    agency: target,
  };

  const [liveness, publicApi, agency] = await Promise.all([
    probe(urls.liveness, { timeoutMs }),
    probe(urls.publicApi, { timeoutMs }),
    probe(urls.agency, { timeoutMs }),
  ]);

  const state = classifyOriginChain({ liveness, publicApi, agency });
  const nextAction = remediationFor(state);

  return { target, origin, slug, state, nextAction, liveness, publicApi, agency };
}

function printResult(result) {
  console.log(`TARGET_URL=${result.target}`);
  console.log(`SITE_SLUG=${result.slug}`);
  for (const [name, value] of [
    ["LIVENESS", result.liveness],
    ["PUBLIC_API", result.publicApi],
    ["AGENCY", result.agency],
  ]) {
    console.log(`${name}_HTTP=${value.status}`);
    console.log(`${name}_MS=${value.durationMs}`);
    if (value.server) console.log(`${name}_SERVER=${value.server}`);
    if (value.contractVersion) console.log(`${name}_CONTRACT_VERSION=${value.contractVersion}`);
    if (value.brandRuntime) console.log(`${name}_BRAND_RUNTIME=${value.brandRuntime}`);
    if (!value.ok && value.bodyPreview) console.log(`${name}_BODY=${value.bodyPreview}`);
  }
  console.log(`ORIGIN_CHAIN_STATE=${result.state}`);
  console.log(`NEXT_ACTION=${result.nextAction}`);
  console.log(`P0_ORIGIN_READY=${result.state === "PUBLIC_CHAIN_READY"}`);
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
  const timeoutArg = process.argv.find((arg) => arg.startsWith("--timeout-ms="));
  const result = await run({
    targetUrl: urlArg ? urlArg.slice("--url=".length) : undefined,
    timeoutMs: timeoutArg ? Number(timeoutArg.slice("--timeout-ms=".length)) || DEFAULT_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
  });
  printResult(result);
  if (process.argv.includes("--gate=true") && result.state !== "PUBLIC_CHAIN_READY") {
    process.exitCode = 1;
  }
}

export {
  classifyOriginChain,
  isReverseProxyServer,
  normalizeBaseUrl,
  probe,
  remediationFor,
  run,
  siteSlugFromUrl,
};
