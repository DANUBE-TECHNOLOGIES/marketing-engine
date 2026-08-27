import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyOriginChain,
  isReverseProxyServer,
  normalizeBaseUrl,
  remediationFor,
  siteSlugFromUrl,
} from "../scripts/public-origin-chain-probe.mjs";

function sample(status, server = "") {
  return { status, server };
}

test("origin chain derives the deployed agency origin and slug", () => {
  assert.equal(
    normalizeBaseUrl("https://agences.mondescale.com/agence/gien"),
    "https://agences.mondescale.com"
  );
  assert.equal(siteSlugFromUrl("https://agences.mondescale.com/agence/gien"), "gien");
  assert.equal(siteSlugFromUrl("https://example.test/agence/bois-colombes?x=1"), "bois-colombes");
});

test("origin chain recognizes common reverse proxy server headers", () => {
  assert.equal(isReverseProxyServer("openresty"), true);
  assert.equal(isReverseProxyServer("nginx/1.27"), true);
  assert.equal(isReverseProxyServer("Next.js"), false);
});

test("origin chain distinguishes proxy, public API and render failures", () => {
  assert.equal(
    classifyOriginChain({ liveness: sample(502, "openresty"), publicApi: sample(502), agency: sample(502) }),
    "PUBLIC_REVERSE_PROXY_UPSTREAM_FAILURE"
  );
  assert.equal(
    classifyOriginChain({ liveness: sample(502), publicApi: sample(502), agency: sample(502) }),
    "FRONTEND_OR_PROXY_UNAVAILABLE"
  );
  assert.equal(
    classifyOriginChain({ liveness: sample(200), publicApi: sample(502), agency: sample(502) }),
    "PUBLIC_API_UPSTREAM_FAILURE"
  );
  assert.equal(
    classifyOriginChain({ liveness: sample(200), publicApi: sample(200), agency: sample(502) }),
    "AGENCY_RENDER_FAILURE"
  );
  assert.equal(
    classifyOriginChain({ liveness: sample(200), publicApi: sample(200), agency: sample(200) }),
    "PUBLIC_CHAIN_READY"
  );
});

test("reverse proxy 502 directs remediation to the frontend upstream", () => {
  assert.equal(
    remediationFor("PUBLIC_REVERSE_PROXY_UPSTREAM_FAILURE"),
    "CHECK_REVERSE_PROXY_UPSTREAM_AND_FRONTEND_PORT_3000"
  );
});

test("public API upstream failures direct diagnosis to site-read and Brand/Legal", () => {
  assert.equal(
    remediationFor("PUBLIC_API_UPSTREAM_FAILURE"),
    "CHECK_PUBLIC_SITE_READ_AND_BRAND_LEGAL_UPSTREAMS"
  );
  assert.equal(remediationFor("PUBLIC_CHAIN_READY"), "RUN_PERFORMANCE_PROBES");
});
