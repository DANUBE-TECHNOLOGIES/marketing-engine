"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PUBLIC_INDEXABILITY_REASONS,
  PublicIndexabilityObserver,
  canonicalFromHtml,
  metaRobotsFromHtml,
  parseRobotsTxt,
  robotsDecision,
} = require("../src/modules/search-console-submission/public-indexability-observer");

test("HTML parser extracts canonical and noindex without DOM dependencies", () => {
  const html = '<html><head><link rel="canonical" href="/agence/gien/services/"><meta name="robots" content="noindex,follow"></head></html>';
  assert.equal(canonicalFromHtml(html, "https://agences.mondescale.com/agence/gien/services"), "https://agences.mondescale.com/agence/gien/services");
  assert.equal(metaRobotsFromHtml(html), "noindex");
});

test("robots.txt uses longest matching allow/disallow rule", () => {
  const robots = parseRobotsTxt("User-agent: *\nDisallow: /agence/\nAllow: /agence/gien/\n");
  assert.equal(robots.length, 1);
  assert.deepEqual(robotsDecision("User-agent: *\nDisallow: /agence/\nAllow: /agence/gien/\n", "https://agences.mondescale.com/agence/gien/services"), { allowed: true, matchedRule: "allow:/agence/gien/" });
  assert.deepEqual(robotsDecision("User-agent: *\nDisallow: /agence/\nAllow: /agence/gien/\n", "https://agences.mondescale.com/agence/dax"), { allowed: false, matchedRule: "disallow:/agence/" });
});

test("observer reports public canonical mismatch and remains read-only", async () => {
  const responses = new Map([
    ["https://agences.mondescale.com/robots.txt", { status: 200, url: "https://agences.mondescale.com/robots.txt", contentType: "text/plain", body: "User-agent: *\nAllow: /\n" }],
    ["https://agences.mondescale.com/agence/gien/services", { status: 200, url: "https://agences.mondescale.com/agence/gien/services", contentType: "text/html", body: '<html><head><link rel="canonical" href="https://agences.mondescale.com/agence/gien/contact"></head></html>' }],
  ]);
  const fetchImpl = async (url) => {
    const item = responses.get(url);
    if (!item) throw new Error(`unexpected ${url}`);
    return {
      ok: item.status >= 200 && item.status < 300,
      status: item.status,
      url: item.url,
      headers: { get: (name) => name.toLowerCase() === "content-type" ? item.contentType : null },
      text: async () => item.body,
    };
  };
  const report = await new PublicIndexabilityObserver({ fetchImpl, timeoutMs: 100 }).audit({
    publicOrigin: "https://agences.mondescale.com",
    urls: ["https://agences.mondescale.com/agence/gien/services"],
  });
  assert.equal(report.summary.publicIssueCount, 1);
  assert.equal(report.observations[0].reason, PUBLIC_INDEXABILITY_REASONS.CANONICAL_MISMATCH);
  assert.equal(report.readOnly, true);
  assert.equal(report.writes, false);
});

test("observer distinguishes robots.txt blocking, X-Robots noindex and redirects", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/robots.txt")) return { ok: true, status: 200, url, headers: { get: () => "text/plain" }, text: async () => "User-agent: *\nDisallow: /agence/dax\n" };
    if (url.endsWith("/agence/dax")) return { ok: true, status: 200, url, headers: { get: (name) => name.toLowerCase() === "content-type" ? "text/html" : null }, text: async () => '<link rel="canonical" href="/agence/dax">' };
    if (url.endsWith("/agence/gien")) return { ok: true, status: 200, url, headers: { get: (name) => name.toLowerCase() === "x-robots-tag" ? "noindex" : name.toLowerCase() === "content-type" ? "text/html" : null }, text: async () => '<link rel="canonical" href="/agence/gien">' };
    if (url.endsWith("/agence/nevers")) return { ok: true, status: 200, url: "https://agences.mondescale.com/agence/nevers/", headers: { get: (name) => name.toLowerCase() === "content-type" ? "text/html" : null }, text: async () => '<link rel="canonical" href="/agence/nevers">' };
    throw new Error("unexpected");
  };
  const report = await new PublicIndexabilityObserver({ fetchImpl }).audit({
    publicOrigin: "https://agences.mondescale.com",
    urls: [
      "https://agences.mondescale.com/agence/dax",
      "https://agences.mondescale.com/agence/gien",
      "https://agences.mondescale.com/agence/nevers",
    ],
  });
  assert.equal(report.observations.find((item) => item.expectedUrl.endsWith("/dax")).reason, PUBLIC_INDEXABILITY_REASONS.ROBOTS_TXT_BLOCKED);
  assert.equal(report.observations.find((item) => item.expectedUrl.endsWith("/gien")).reason, PUBLIC_INDEXABILITY_REASONS.X_ROBOTS_NOINDEX);
  // A trailing slash only is normalized and is not treated as a redirect mismatch.
  assert.equal(report.observations.find((item) => item.expectedUrl.endsWith("/nevers")).reason, PUBLIC_INDEXABILITY_REASONS.OK);
});

test("observer refuses to fetch URLs outside the configured public origin", async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    if (url === "https://agences.mondescale.com/robots.txt") return { ok: true, status: 200, url, headers: { get: () => "text/plain" }, text: async () => "User-agent: *\nAllow: /" };
    throw new Error("must not fetch external URL");
  };
  const report = await new PublicIndexabilityObserver({ fetchImpl }).audit({
    publicOrigin: "https://agences.mondescale.com",
    urls: ["https://evil.example/secret"],
  });
  assert.equal(report.observations.length, 0);
  assert.equal(calls, 1);
});
