"use strict";

/**
 * MSE-25.85 — public navigation integrity gate.
 *
 * Read-only runtime graph audit built on the public sitemap. It verifies that:
 * - sitemap pages remain reachable;
 * - every internal agency link discovered in rendered HTML resolves without 4xx/5xx;
 * - links stay scoped to the current agency unless explicitly outside /agence/;
 * - every non-root sitemap URL has at least one rendered incoming link;
 * - no legacy Lamorlaye slug is referenced.
 *
 * No Google API call and no CMS/database mutation is performed.
 */

const {
  sitemapUrls,
  mapConcurrent,
} = require("./mse-25-84-public-surface-quality-gate");

const PUBLIC_ORIGIN = String(
  process.env.PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
).replace(/\/+$/g, "");

const EXPECTED_COUNT = Number.parseInt(
  process.env.MSE_25_85_EXPECTED_SITEMAP_COUNT || "0",
  10
);

const TIMEOUT_MS = Math.max(
  1000,
  Number.parseInt(process.env.MSE_25_85_TIMEOUT_MS || "15000", 10) || 15000
);

const CONCURRENCY = Math.max(
  1,
  Math.min(12, Number.parseInt(process.env.MSE_25_85_CONCURRENCY || "4", 10) || 4)
);

function decodeHtmlAttribute(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeUrl(value, baseUrl = PUBLIC_ORIGIN) {
  if (!value) return null;
  try {
    const url = new URL(decodeHtmlAttribute(value), baseUrl);
    url.hash = "";
    return url.href.replace(/\/$/, "") || url.origin;
  } catch (_error) {
    return null;
  }
}

function extractHrefValues(html) {
  const values = [];
  const source = String(html || "");
  const regex = /<a\b[^>]*\bhref\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/gi;
  for (const match of source.matchAll(regex)) {
    const value = (match[1] ?? match[2] ?? "").trim();
    if (value) values.push(decodeHtmlAttribute(value));
  }
  return values;
}

function isIgnoredHref(value) {
  const href = String(value || "").trim();
  return !href
    || href.startsWith("#")
    || /^(?:mailto|tel|javascript|data):/i.test(href);
}

function agencySlugFromUrl(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    const match = url.pathname.match(/^\/agence\/([^/]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch (_error) {
    return null;
  }
}

function internalAgencyLinks(html, pageUrl) {
  const links = [];
  for (const href of extractHrefValues(html)) {
    if (isIgnoredHref(href)) continue;
    const normalized = normalizeUrl(href, pageUrl);
    if (!normalized) continue;
    const parsed = new URL(normalized);
    if (parsed.origin !== PUBLIC_ORIGIN) continue;
    if (!parsed.pathname.startsWith("/agence/")) continue;
    links.push(normalized);
  }
  return [...new Set(links)];
}

function buildGraph(pages) {
  const incoming = new Map();
  const edges = [];
  const crossAgency = [];
  const legacyLinks = [];

  for (const page of pages) {
    const source = normalizeUrl(page.url);
    const sourceAgency = agencySlugFromUrl(source);
    for (const target of internalAgencyLinks(page.html, source)) {
      edges.push({ source, target });
      if (!incoming.has(target)) incoming.set(target, new Set());
      incoming.get(target).add(source);

      const targetAgency = agencySlugFromUrl(target);
      if (sourceAgency && targetAgency && sourceAgency !== targetAgency) {
        crossAgency.push({ source, target });
      }
      if (/\/agence\/ambassade-fram-mondescale-lamorlaye(?:\/|$)/i.test(new URL(target).pathname)) {
        legacyLinks.push({ source, target });
      }
    }
  }

  return { incoming, edges, crossAgency, legacyLinks };
}

function siteRootUrl(value) {
  const normalized = normalizeUrl(value);
  const slug = agencySlugFromUrl(normalized);
  return slug ? `${PUBLIC_ORIGIN}/agence/${encodeURIComponent(slug)}` : null;
}

function orphanedSitemapUrls(sitemap, graph) {
  const sitemapSet = new Set(sitemap.map((url) => normalizeUrl(url)));
  return [...sitemapSet].filter((url) => {
    if (url === siteRootUrl(url)) return false;
    const sources = graph.incoming.get(url);
    return !sources || sources.size === 0;
  });
}

async function fetchPage(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      "User-Agent": "Mondescale-MSE-25.85-Navigation-Integrity-Gate/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return {
    url,
    status: response.status,
    finalUrl: response.url,
    redirected: response.redirected,
    html: await response.text(),
  };
}

async function checkTarget(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "User-Agent": "Mondescale-MSE-25.85-Navigation-Integrity-Gate/1.0",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return {
      url,
      status: response.status,
      finalUrl: normalizeUrl(response.url),
      ok: response.status >= 200 && response.status < 400,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      finalUrl: null,
      ok: false,
      error: error?.message || String(error),
    };
  }
}

function summarize({ sitemap, pages, graph, targetResults }) {
  const sitemapSet = new Set(sitemap.map((url) => normalizeUrl(url)));
  const pageFailures = pages.filter((page) => page.status !== 200 || normalizeUrl(page.finalUrl) !== normalizeUrl(page.url));
  const brokenTargets = targetResults.filter((item) => !item.ok);
  const orphans = orphanedSitemapUrls(sitemap, graph);
  const offSitemapTargets = [...new Set(graph.edges.map((edge) => edge.target))]
    .filter((target) => !sitemapSet.has(target));

  return {
    sitemapCount: sitemap.length,
    pageFailures,
    brokenTargets,
    orphans,
    crossAgency: graph.crossAgency,
    legacyLinks: graph.legacyLinks,
    edgeCount: graph.edges.length,
    uniqueTargetCount: new Set(graph.edges.map((edge) => edge.target)).size,
    offSitemapTargets,
    ok: pageFailures.length === 0
      && brokenTargets.length === 0
      && orphans.length === 0
      && graph.crossAgency.length === 0
      && graph.legacyLinks.length === 0,
  };
}

async function main() {
  const sitemapResponse = await fetch(`${PUBLIC_ORIGIN}/sitemap.xml`, {
    headers: { "User-Agent": "Mondescale-MSE-25.85-Navigation-Integrity-Gate/1.0" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sitemapResponse.ok) throw new Error(`SITEMAP_HTTP_${sitemapResponse.status}`);

  const sitemap = sitemapUrls(await sitemapResponse.text()).map((url) => normalizeUrl(url));
  if (!sitemap.length) throw new Error("PUBLIC_SITEMAP_EMPTY");
  if (new Set(sitemap).size !== sitemap.length) throw new Error("PUBLIC_SITEMAP_DUPLICATE_URLS");
  if (EXPECTED_COUNT > 0 && sitemap.length !== EXPECTED_COUNT) {
    throw new Error(`PUBLIC_SITEMAP_COUNT_MISMATCH expected=${EXPECTED_COUNT} actual=${sitemap.length}`);
  }

  const pages = await mapConcurrent(sitemap, fetchPage, CONCURRENCY);
  const graph = buildGraph(pages);
  const targets = [...new Set(graph.edges.map((edge) => edge.target))];
  const targetResults = await mapConcurrent(targets, checkTarget, CONCURRENCY);
  const summary = summarize({ sitemap, pages, graph, targetResults });

  console.log("================================================");
  console.log("=== MSE-25.85 - NAVIGATION INTEGRITY ==========");
  console.log("================================================");
  console.log(`PUBLIC=${PUBLIC_ORIGIN}`);
  console.log(`SITEMAP=${summary.sitemapCount}`);
  console.log(`SITEMAP_PAGES_OK=${summary.sitemapCount - summary.pageFailures.length}/${summary.sitemapCount}`);
  console.log(`INTERNAL_LINK_EDGES=${summary.edgeCount}`);
  console.log(`UNIQUE_INTERNAL_TARGETS=${summary.uniqueTargetCount}`);
  console.log(`BROKEN_INTERNAL_TARGETS=${summary.brokenTargets.length}`);
  console.log(`ORPHAN_SITEMAP_URLS=${summary.orphans.length}`);
  console.log(`CROSS_AGENCY_LINKS=${summary.crossAgency.length}`);
  console.log(`LEGACY_LAMORLAYE_LINKS=${summary.legacyLinks.length}`);
  console.log(`OFF_SITEMAP_INTERNAL_TARGETS=${summary.offSitemapTargets.length}`);
  console.log("GOOGLE_WRITES=0");
  console.log("CMS_WRITES=0");
  console.log("DATABASE_WRITES=0");

  if (!summary.ok) {
    for (const item of summary.pageFailures.slice(0, 20)) {
      console.error(`PAGE_FAILURE ${item.url} status=${item.status} final=${item.finalUrl}`);
    }
    for (const item of summary.brokenTargets.slice(0, 20)) {
      console.error(`BROKEN_LINK ${item.url} status=${item.status}${item.error ? ` error=${item.error}` : ""}`);
    }
    for (const url of summary.orphans.slice(0, 20)) console.error(`ORPHAN ${url}`);
    for (const item of summary.crossAgency.slice(0, 20)) console.error(`CROSS_AGENCY ${item.source} -> ${item.target}`);
    for (const item of summary.legacyLinks.slice(0, 20)) console.error(`LEGACY_LAMORLAYE ${item.source} -> ${item.target}`);
    process.exitCode = 1;
    return;
  }

  console.log("MSE-25.85=PASS");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("================================================");
    console.error("=== MSE-25.85 - FAIL ==========================");
    console.error("================================================");
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  agencySlugFromUrl,
  buildGraph,
  decodeHtmlAttribute,
  extractHrefValues,
  internalAgencyLinks,
  isIgnoredHref,
  normalizeUrl,
  orphanedSitemapUrls,
  siteRootUrl,
  summarize,
};
