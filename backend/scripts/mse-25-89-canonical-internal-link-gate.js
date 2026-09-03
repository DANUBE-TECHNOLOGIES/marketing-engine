"use strict";

/**
 * MSE-25.89 — canonical internal-link gate.
 *
 * Read-only crawl over the public sitemap. It verifies that every rendered
 * internal /agence/ link resolves directly, without a redirect hop, to a
 * successful canonical public URL. This complements MSE-25.85, which proves
 * reachability/graph integrity but intentionally follows redirects.
 *
 * No Google API call and no CMS/database mutation is performed.
 */

const {
  sitemapUrls,
  mapConcurrent,
} = require("./mse-25-84-public-surface-quality-gate");
const {
  internalAgencyLinks,
  normalizeUrl,
} = require("./mse-25-85-public-navigation-integrity-gate");

const PUBLIC_ORIGIN = String(
  process.env.PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
).replace(/\/+$/g, "");

const EXPECTED_COUNT = Number.parseInt(
  process.env.MSE_25_89_EXPECTED_SITEMAP_COUNT || "0",
  10
);

const TIMEOUT_MS = Math.max(
  1000,
  Number.parseInt(process.env.MSE_25_89_TIMEOUT_MS || "15000", 10) || 15000
);

const CONCURRENCY = Math.max(
  1,
  Math.min(12, Number.parseInt(process.env.MSE_25_89_CONCURRENCY || "4", 10) || 4)
);

function isRedirectStatus(status) {
  return [301, 302, 303, 307, 308].includes(Number(status));
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      "User-Agent": "Mondescale-MSE-25.89-Canonical-Link-Gate/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  return {
    url: normalizeUrl(url),
    status: response.status,
    finalUrl: normalizeUrl(response.url),
    html: await response.text(),
  };
}

async function inspectDirectTarget(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "User-Agent": "Mondescale-MSE-25.89-Canonical-Link-Gate/1.0",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return {
      url: normalizeUrl(url),
      status: response.status,
      location: response.headers.get("location"),
      redirected: isRedirectStatus(response.status),
      ok: response.status >= 200 && response.status < 300,
    };
  } catch (error) {
    return {
      url: normalizeUrl(url),
      status: 0,
      location: null,
      redirected: false,
      ok: false,
      error: error?.message || String(error),
    };
  }
}

function collectLinks(pages) {
  const edges = [];
  const targets = new Set();

  for (const page of pages) {
    for (const target of internalAgencyLinks(page.html, page.url)) {
      const normalized = normalizeUrl(target);
      if (!normalized) continue;
      edges.push({ source: page.url, target: normalized });
      targets.add(normalized);
    }
  }

  return { edges, targets: [...targets] };
}

function summarize({ sitemap, pages, edges, targetResults }) {
  const pageFailures = pages.filter(
    (page) => page.status !== 200 || page.finalUrl !== page.url
  );
  const redirectTargets = targetResults.filter((item) => item.redirected);
  const failedTargets = targetResults.filter((item) => !item.ok && !item.redirected);
  const redirectTargetSet = new Set(redirectTargets.map((item) => item.url));
  const redirectEdges = edges.filter((edge) => redirectTargetSet.has(edge.target));

  return {
    sitemapCount: sitemap.length,
    pageFailures,
    redirectTargets,
    failedTargets,
    redirectEdges,
    edgeCount: edges.length,
    uniqueTargetCount: targetResults.length,
    ok: pageFailures.length === 0
      && redirectTargets.length === 0
      && failedTargets.length === 0,
  };
}

async function main() {
  const sitemapResponse = await fetch(`${PUBLIC_ORIGIN}/sitemap.xml`, {
    headers: {
      "User-Agent": "Mondescale-MSE-25.89-Canonical-Link-Gate/1.0",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!sitemapResponse.ok) {
    throw new Error(`SITEMAP_HTTP_${sitemapResponse.status}`);
  }

  const sitemap = sitemapUrls(await sitemapResponse.text()).map((url) => normalizeUrl(url));
  if (!sitemap.length) throw new Error("PUBLIC_SITEMAP_EMPTY");
  if (new Set(sitemap).size !== sitemap.length) throw new Error("PUBLIC_SITEMAP_DUPLICATE_URLS");
  if (EXPECTED_COUNT > 0 && sitemap.length !== EXPECTED_COUNT) {
    throw new Error(`PUBLIC_SITEMAP_COUNT_MISMATCH expected=${EXPECTED_COUNT} actual=${sitemap.length}`);
  }

  const pages = await mapConcurrent(sitemap, fetchHtml, CONCURRENCY);
  const { edges, targets } = collectLinks(pages);
  const targetResults = await mapConcurrent(targets, inspectDirectTarget, CONCURRENCY);
  const summary = summarize({ sitemap, pages, edges, targetResults });

  console.log("================================================");
  console.log("=== MSE-25.89 - CANONICAL INTERNAL LINKS ======");
  console.log("================================================");
  console.log(`PUBLIC=${PUBLIC_ORIGIN}`);
  console.log(`SITEMAP=${summary.sitemapCount}`);
  console.log(`SITEMAP_PAGES_DIRECT_200=${summary.sitemapCount - summary.pageFailures.length}/${summary.sitemapCount}`);
  console.log(`INTERNAL_LINK_EDGES=${summary.edgeCount}`);
  console.log(`UNIQUE_INTERNAL_TARGETS=${summary.uniqueTargetCount}`);
  console.log(`REDIRECTING_INTERNAL_TARGETS=${summary.redirectTargets.length}`);
  console.log(`REDIRECTING_INTERNAL_EDGES=${summary.redirectEdges.length}`);
  console.log(`FAILED_INTERNAL_TARGETS=${summary.failedTargets.length}`);
  console.log("GOOGLE_WRITES=0");
  console.log("CMS_WRITES=0");
  console.log("DATABASE_WRITES=0");

  if (!summary.ok) {
    for (const item of summary.pageFailures.slice(0, 20)) {
      console.error(`PAGE_NOT_DIRECT_200 ${item.url} status=${item.status} final=${item.finalUrl}`);
    }
    for (const item of summary.redirectTargets.slice(0, 30)) {
      console.error(`REDIRECT_TARGET ${item.url} status=${item.status} location=${item.location || ""}`);
    }
    for (const edge of summary.redirectEdges.slice(0, 30)) {
      console.error(`REDIRECT_EDGE ${edge.source} -> ${edge.target}`);
    }
    for (const item of summary.failedTargets.slice(0, 20)) {
      console.error(`FAILED_TARGET ${item.url} status=${item.status}${item.error ? ` error=${item.error}` : ""}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("MSE-25.89=PASS");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("================================================");
    console.error("=== MSE-25.89 - FAIL ==========================");
    console.error("================================================");
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  collectLinks,
  inspectDirectTarget,
  isRedirectStatus,
  summarize,
};
