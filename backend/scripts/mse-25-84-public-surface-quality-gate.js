"use strict";

/**
 * MSE-25.84 — full public surface quality gate.
 *
 * Read-only crawl of every URL exposed by the public sitemap. It verifies the
 * invariants that can regress while Search Console demand data is still empty:
 * HTTP availability, canonical self-reference, indexability, one H1, metadata,
 * JSON-LD parseability and the shared reassurance band.
 *
 * No Google API call and no CMS/database mutation is performed here.
 */

const {
  allowsIndexing,
  extractCanonical,
  sameCanonical,
} = require("./mse-25-30-public-html-check");

const PUBLIC_ORIGIN = String(
  process.env.PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
).replace(/\/+$/g, "");

const EXPECTED_COUNT = Number.parseInt(
  process.env.MSE_25_84_EXPECTED_SITEMAP_COUNT || "0",
  10
);

const CONCURRENCY = Math.max(
  1,
  Math.min(12, Number.parseInt(process.env.MSE_25_84_CONCURRENCY || "4", 10) || 4)
);

const TIMEOUT_MS = Math.max(
  1000,
  Number.parseInt(process.env.MSE_25_84_TIMEOUT_MS || "15000", 10) || 15000
);

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

function countTag(html, tagName) {
  const tag = String(tagName || "").replace(/[^a-z0-9-]/gi, "");
  if (!tag) return 0;
  return (String(html || "").match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
}

function extractTitle(html) {
  const match = String(html || "").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function extractMetaDescription(html) {
  const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (name !== "description") continue;
    return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim() || "";
  }
  return "";
}

function jsonLdScripts(html) {
  const scripts = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of String(html || "").matchAll(re)) scripts.push(match[1].trim());
  return scripts;
}

function parseJsonLd(html) {
  const scripts = jsonLdScripts(html);
  const errors = [];
  for (let i = 0; i < scripts.length; i += 1) {
    try {
      JSON.parse(scripts[i]);
    } catch (error) {
      errors.push({ index: i, message: error.message });
    }
  }
  return { count: scripts.length, errors };
}

function hasReassuranceBand(html) {
  return /class=["'][^"']*\bpublic-reassurance\b[^"']*["']/i.test(String(html || ""));
}

function inspectHtml({ url, html, status = 200, redirected = false, finalUrl = url, durationMs = 0 }) {
  const canonical = extractCanonical(html);
  const h1Count = countTag(html, "h1");
  const title = extractTitle(html);
  const description = extractMetaDescription(html);
  const jsonLd = parseJsonLd(html);
  const issues = [];

  if (status !== 200) issues.push(`http-${status}`);
  if (redirected || !sameCanonical(finalUrl, url)) issues.push("unexpected-redirect");
  if (!sameCanonical(canonical, url)) issues.push("canonical-mismatch");
  if (!allowsIndexing(html)) issues.push("noindex");
  if (h1Count !== 1) issues.push(`h1-count-${h1Count}`);
  if (!title) issues.push("missing-title");
  if (!description) issues.push("missing-meta-description");
  if (jsonLd.count === 0) issues.push("missing-jsonld");
  if (jsonLd.errors.length > 0) issues.push("invalid-jsonld");
  if (!hasReassuranceBand(html)) issues.push("missing-reassurance-band");

  return {
    url,
    status,
    redirected,
    finalUrl,
    canonical: canonical || null,
    indexable: allowsIndexing(html),
    h1Count,
    titlePresent: Boolean(title),
    descriptionPresent: Boolean(description),
    jsonLdCount: jsonLd.count,
    jsonLdErrors: jsonLd.errors,
    reassurance: hasReassuranceBand(html),
    durationMs,
    issues,
    ok: issues.length === 0,
  };
}

async function fetchText(url, { redirect = "follow" } = {}) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mondescale-MSE-25.84-Public-Quality-Gate/1.0",
    },
    redirect,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  return {
    response,
    text,
    durationMs: Date.now() - startedAt,
  };
}

async function inspectUrl(url) {
  try {
    const { response, text, durationMs } = await fetchText(url);
    return inspectHtml({
      url,
      html: text,
      status: response.status,
      redirected: response.redirected,
      finalUrl: response.url,
      durationMs,
    });
  } catch (error) {
    return {
      url,
      status: 0,
      redirected: false,
      finalUrl: null,
      canonical: null,
      indexable: false,
      h1Count: 0,
      titlePresent: false,
      descriptionPresent: false,
      jsonLdCount: 0,
      jsonLdErrors: [],
      reassurance: false,
      durationMs: 0,
      issues: [`fetch-error:${error?.name || "Error"}`],
      error: error?.message || String(error),
      ok: false,
    };
  }
}

async function mapConcurrent(values, worker, concurrency = CONCURRENCY) {
  const results = new Array(values.length);
  let cursor = 0;

  async function runWorker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      results[index] = await worker(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, runWorker));
  return results;
}

function percentile(values, ratio) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function summarize(results) {
  const failures = results.filter((item) => !item.ok);
  const durations = results.map((item) => item.durationMs).filter((value) => value > 0);
  return {
    urlCount: results.length,
    okCount: results.length - failures.length,
    failureCount: failures.length,
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    maxMs: durations.length ? Math.max(...durations) : 0,
    failures,
  };
}

async function main() {
  const sitemapUrl = `${PUBLIC_ORIGIN}/sitemap.xml`;
  const { response, text: xml } = await fetchText(sitemapUrl);
  if (!response.ok) throw new Error(`SITEMAP_HTTP_${response.status}`);

  const urls = sitemapUrls(xml);
  const uniqueUrls = [...new Set(urls)];

  if (!urls.length) throw new Error("PUBLIC_SITEMAP_EMPTY");
  if (uniqueUrls.length !== urls.length) throw new Error("PUBLIC_SITEMAP_DUPLICATE_URLS");
  if (EXPECTED_COUNT > 0 && urls.length !== EXPECTED_COUNT) {
    throw new Error(`PUBLIC_SITEMAP_COUNT_MISMATCH expected=${EXPECTED_COUNT} actual=${urls.length}`);
  }

  const invalidOrigins = urls.filter((url) => !url.startsWith(`${PUBLIC_ORIGIN}/agence/`));
  if (invalidOrigins.length) {
    throw new Error(`PUBLIC_SITEMAP_NON_CANONICAL_ORIGIN ${invalidOrigins.slice(0, 5).join(",")}`);
  }

  const results = await mapConcurrent(urls, inspectUrl);
  const summary = summarize(results);

  console.log("================================================");
  console.log("=== MSE-25.84 - PUBLIC SURFACE QUALITY ========");
  console.log("================================================");
  console.log(`PUBLIC=${PUBLIC_ORIGIN}`);
  console.log(`SITEMAP=${urls.length}`);
  console.log(`HTTP_200=${results.filter((item) => item.status === 200).length}/${urls.length}`);
  console.log(`CANONICAL_SELF=${results.filter((item) => sameCanonical(item.canonical, item.url)).length}/${urls.length}`);
  console.log(`INDEXABLE=${results.filter((item) => item.indexable).length}/${urls.length}`);
  console.log(`H1_EXACTLY_ONE=${results.filter((item) => item.h1Count === 1).length}/${urls.length}`);
  console.log(`TITLE_PRESENT=${results.filter((item) => item.titlePresent).length}/${urls.length}`);
  console.log(`META_DESCRIPTION_PRESENT=${results.filter((item) => item.descriptionPresent).length}/${urls.length}`);
  console.log(`JSONLD_VALID=${results.filter((item) => item.jsonLdCount > 0 && item.jsonLdErrors.length === 0).length}/${urls.length}`);
  console.log(`REASSURANCE_PRESENT=${results.filter((item) => item.reassurance).length}/${urls.length}`);
  console.log(`LATENCY_P50_MS=${summary.p50Ms}`);
  console.log(`LATENCY_P95_MS=${summary.p95Ms}`);
  console.log(`LATENCY_MAX_MS=${summary.maxMs}`);
  console.log("GOOGLE_WRITES=0");
  console.log("CMS_WRITES=0");
  console.log("DATABASE_WRITES=0");

  if (summary.failureCount > 0) {
    console.error(`PUBLIC_QUALITY_FAILURES=${summary.failureCount}`);
    for (const failure of summary.failures.slice(0, 30)) {
      console.error(`${failure.url} :: ${failure.issues.join(",")}`);
      if (failure.error) console.error(`  ${failure.error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PUBLIC_QUALITY_FAILURES=0");
  console.log("MSE-25.84=PASS");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("================================================");
    console.error("=== MSE-25.84 - FAIL ==========================");
    console.error("================================================");
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  countTag,
  extractMetaDescription,
  extractTitle,
  hasReassuranceBand,
  inspectHtml,
  jsonLdScripts,
  mapConcurrent,
  parseJsonLd,
  percentile,
  sitemapUrls,
  summarize,
};
