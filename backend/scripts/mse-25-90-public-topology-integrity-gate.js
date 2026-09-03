"use strict";

/**
 * MSE-25.90 — public topology integrity gate.
 *
 * Read-only verification of the sitemap topology after publication changes.
 * It deliberately does not assume a fixed total URL count: individual sites
 * may expose additional destination/editorial pages. Instead it certifies the
 * published site set, mandatory canonical routes and absence of legacy aliases.
 *
 * The /inspiration index is intentionally not a mandatory sitemap route: the
 * dedicated frontend route switches to noindex when an agency has no published
 * inspiration article. In that state, omitting /inspiration from the sitemap is
 * the correct canonical/indexation behaviour and must not fail this topology gate.
 *
 * No Google API call and no CMS/database mutation is performed here.
 */

const PUBLIC_ORIGIN = String(
  process.env.PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
).replace(/\/+$/g, "");

const TIMEOUT_MS = Math.max(
  1000,
  Number.parseInt(process.env.MSE_25_90_TIMEOUT_MS || "15000", 10) || 15000
);

const EXPECTED_SITE_COUNT = Math.max(
  0,
  Number.parseInt(process.env.MSE_25_90_EXPECTED_SITE_COUNT || "0", 10) || 0
);

const DEFAULT_REQUIRED_PATHS = [
  "",
  "agence",
  "equipe",
  "partenaires",
  "services",
  "destinations",
  "contact",
];

const CONDITIONAL_PATHS = new Set([
  "inspiration",
]);

const LEGACY_PATH_SEGMENTS = new Set([
  "home",
  "accueil",
  "index",
  "inspirations",
  "team",
  "partners",
]);

function csvValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const EXPECTED_SITES = csvValues(process.env.MSE_25_90_EXPECTED_SITES);
const REQUIRED_PATHS = (() => {
  const configured = csvValues(process.env.MSE_25_90_REQUIRED_PATHS);
  if (!configured.length) return DEFAULT_REQUIRED_PATHS;
  return configured.map((item) => item.replace(/^\/+|\/+$/g, ""));
})();

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function sitemapUrls(xml) {
  const urls = [];
  for (const match of String(xml || "").matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)) {
    const url = decodeXml(match[1]).trim();
    if (url) urls.push(url);
  }
  return urls;
}

function parseAgencyUrl(value, publicOrigin = PUBLIC_ORIGIN) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    return null;
  }

  if (url.origin !== publicOrigin) return null;

  const match = url.pathname.match(/^\/agence\/([^/]+)(?:\/(.*))?$/);
  if (!match) return null;

  const siteSlug = decodeURIComponent(match[1]);
  const relativePath = String(match[2] || "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");

  return {
    url: url.toString(),
    siteSlug,
    relativePath,
    segments: relativePath ? relativePath.split("/") : [],
  };
}

function buildTopology(urls, publicOrigin = PUBLIC_ORIGIN) {
  const sites = new Map();
  const invalidUrls = [];
  const duplicateUrls = [];
  const legacyUrls = [];
  const seen = new Set();

  for (const rawUrl of urls) {
    if (seen.has(rawUrl)) duplicateUrls.push(rawUrl);
    seen.add(rawUrl);

    const parsed = parseAgencyUrl(rawUrl, publicOrigin);
    if (!parsed) {
      invalidUrls.push(rawUrl);
      continue;
    }

    if (parsed.segments.some((segment) => LEGACY_PATH_SEGMENTS.has(segment.toLowerCase()))) {
      legacyUrls.push(rawUrl);
    }

    if (!sites.has(parsed.siteSlug)) {
      sites.set(parsed.siteSlug, {
        siteSlug: parsed.siteSlug,
        urls: [],
        paths: new Set(),
      });
    }

    const site = sites.get(parsed.siteSlug);
    site.urls.push(rawUrl);
    site.paths.add(parsed.relativePath);
  }

  return {
    sites,
    invalidUrls,
    duplicateUrls,
    legacyUrls,
  };
}

function summarizeTopology(topology, {
  expectedSites = EXPECTED_SITES,
  expectedSiteCount = EXPECTED_SITE_COUNT,
  requiredPaths = REQUIRED_PATHS,
} = {}) {
  const actualSites = [...topology.sites.keys()].sort();
  const expected = [...new Set(expectedSites)].sort();
  const missingSites = expected.filter((site) => !topology.sites.has(site));
  const unexpectedSites = expected.length
    ? actualSites.filter((site) => !expected.includes(site))
    : [];

  const siteDetails = actualSites.map((siteSlug) => {
    const site = topology.sites.get(siteSlug);
    const missingPaths = requiredPaths.filter((path) => !site.paths.has(path));
    const conditionalPaths = [...CONDITIONAL_PATHS].filter((path) => site.paths.has(path));
    return {
      siteSlug,
      urlCount: site.urls.length,
      missingPaths,
      conditionalPaths,
      ok: missingPaths.length === 0,
    };
  });

  const failures = [];
  if (topology.invalidUrls.length) failures.push("invalid-public-url");
  if (topology.duplicateUrls.length) failures.push("duplicate-sitemap-url");
  if (topology.legacyUrls.length) failures.push("legacy-public-route");
  if (missingSites.length) failures.push("missing-published-site");
  if (unexpectedSites.length) failures.push("unexpected-published-site");
  if (expectedSiteCount > 0 && actualSites.length !== expectedSiteCount) {
    failures.push("published-site-count-mismatch");
  }
  if (siteDetails.some((site) => !site.ok)) failures.push("missing-required-route");

  return {
    actualSites,
    missingSites,
    unexpectedSites,
    siteDetails,
    failures,
    ok: failures.length === 0,
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mondescale-MSE-25.90-Public-Topology-Gate/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  return { response, text };
}

async function main() {
  const sitemapUrl = `${PUBLIC_ORIGIN}/sitemap.xml`;
  const { response, text } = await fetchText(sitemapUrl);
  if (!response.ok) throw new Error(`SITEMAP_HTTP_${response.status}`);

  const urls = sitemapUrls(text);
  if (!urls.length) throw new Error("PUBLIC_SITEMAP_EMPTY");

  const topology = buildTopology(urls);
  const summary = summarizeTopology(topology);

  console.log("================================================");
  console.log("=== MSE-25.90 - PUBLIC TOPOLOGY INTEGRITY =====");
  console.log("================================================");
  console.log(`PUBLIC=${PUBLIC_ORIGIN}`);
  console.log(`PUBLIC_URLS=${urls.length}`);
  console.log(`PUBLISHED_SITES=${summary.actualSites.length}`);
  console.log(`SITEMAP_DUPLICATES=${topology.duplicateUrls.length}`);
  console.log(`INVALID_PUBLIC_URLS=${topology.invalidUrls.length}`);
  console.log(`LEGACY_PUBLIC_URLS=${topology.legacyUrls.length}`);
  console.log(`MISSING_EXPECTED_SITES=${summary.missingSites.length}`);
  console.log(`UNEXPECTED_SITES=${summary.unexpectedSites.length}`);

  for (const site of summary.siteDetails) {
    console.log(
      `SITE=${site.siteSlug} URLS=${site.urlCount} REQUIRED_ROUTES=${site.missingPaths.length ? `MISSING:${site.missingPaths.join("|")}` : "OK"} CONDITIONAL_ROUTES=${site.conditionalPaths.length ? site.conditionalPaths.join("|") : "NONE"}`
    );
  }

  console.log("GOOGLE_WRITES=0");
  console.log("SITEMAP_SUBMISSION=0");
  console.log("CMS_WRITES=0");
  console.log("DATABASE_WRITES=0");

  if (!summary.ok) {
    console.error(`PUBLIC_TOPOLOGY_FAILURES=${summary.failures.length}`);
    for (const failure of summary.failures) console.error(`FAILURE=${failure}`);
    for (const site of summary.missingSites) console.error(`MISSING_SITE=${site}`);
    for (const site of summary.unexpectedSites) console.error(`UNEXPECTED_SITE=${site}`);
    for (const url of topology.legacyUrls.slice(0, 30)) console.error(`LEGACY_URL=${url}`);
    for (const site of summary.siteDetails.filter((item) => !item.ok)) {
      console.error(`MISSING_ROUTE site=${site.siteSlug} paths=${site.missingPaths.join(",")}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PUBLIC_TOPOLOGY_FAILURES=0");
  console.log("MSE-25.90=PASS");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("================================================");
    console.error("=== MSE-25.90 - FAIL ==========================");
    console.error("================================================");
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  CONDITIONAL_PATHS,
  DEFAULT_REQUIRED_PATHS,
  LEGACY_PATH_SEGMENTS,
  buildTopology,
  csvValues,
  parseAgencyUrl,
  sitemapUrls,
  summarizeTopology,
};
