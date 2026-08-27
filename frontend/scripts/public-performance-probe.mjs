#!/usr/bin/env node

import { performance } from "node:perf_hooks";

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function numberArg(name, fallback) {
  const parsed = Number(arg(name, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function absoluteUrl(base, value) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function urlOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function tagAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
  return match?.[1] || null;
}

function imageUrls(html, baseUrl) {
  const found = new Set();
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = tagAttribute(match[0], "src");
    const resolved = src ? absoluteUrl(baseUrl, src) : null;
    if (resolved) found.add(resolved);
  }
  return [...found];
}

function heroContract(html, baseUrl) {
  const tag = html.match(/<img\b[^>]*fetchpriority=["']high["'][^>]*>/i)?.[0]
    || html.match(/<img\b[^>]*loading=["']eager["'][^>]*>/i)?.[0]
    || "";
  const src = tagAttribute(tag, "src");
  return {
    present: Boolean(tag),
    url: src ? absoluteUrl(baseUrl, src) : null,
    highPriority: /fetchpriority=["']high["']/i.test(tag),
    eager: /loading=["']eager["']/i.test(tag),
    width: /\bwidth=["'][1-9][0-9]*["']/i.test(tag),
    height: /\bheight=["'][1-9][0-9]*["']/i.test(tag),
  };
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function isModernImageType(type) {
  const normalized = String(type || "").toLowerCase();
  return normalized.includes("image/avif") || normalized.includes("image/webp");
}

function cacheLifetimeSeconds(cacheControl) {
  const value = String(cacheControl || "");
  const shared = value.match(/(?:^|,)\s*s-maxage=(\d+)/i);
  if (shared) return Number(shared[1]);
  const browser = value.match(/(?:^|,)\s*max-age=(\d+)/i);
  return browser ? Number(browser[1]) : 0;
}

function isCacheable(cacheControl) {
  const value = String(cacheControl || "").toLowerCase();
  if (!value || value.includes("no-store")) return false;
  return value.includes("immutable") || cacheLifetimeSeconds(value) > 0;
}

async function timedFetch(url, options = {}) {
  const start = performance.now();
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    ...options,
  });
  const headersAt = performance.now();
  const body = await response.arrayBuffer();
  const end = performance.now();
  return {
    response,
    body,
    ttfbMs: Math.round(headersAt - start),
    totalMs: Math.round(end - start),
    transferBytes: body.byteLength,
  };
}

async function inspectImage(url) {
  try {
    const result = await timedFetch(url, {
      headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
    });
    const type = result.response.headers.get("content-type");
    const cacheControl = result.response.headers.get("cache-control");
    return {
      url,
      origin: urlOrigin(result.response.url || url),
      finalUrl: result.response.url,
      status: result.response.status,
      bytes: result.transferBytes,
      type,
      modernFormat: isModernImageType(type),
      cacheControl,
      cacheable: isCacheable(cacheControl),
      cacheLifetimeSeconds: cacheLifetimeSeconds(cacheControl),
      ttfbMs: result.ttfbMs,
      totalMs: result.totalMs,
    };
  } catch (error) {
    return { url, origin: urlOrigin(url), error: error.message };
  }
}

const target = arg("url", process.env.PUBLIC_PERFORMANCE_URL);
const maxImages = Math.max(1, Math.min(20, numberArg("max-images", 8)));
const samples = Math.max(1, Math.min(7, numberArg("samples", 3)));
const json = arg("json", "false") === "true";
const gate = arg("gate", "false") === "true";
const maxTtfbMs = Math.max(100, numberArg("max-ttfb-ms", 1200));
const maxHeroBytes = Math.max(50_000, numberArg("max-hero-bytes", 1_000_000));
const maxSingleImageBytes = Math.max(50_000, numberArg("max-single-image-bytes", 1_500_000));
const maxTotalImageBytes = Math.max(100_000, numberArg("max-total-image-bytes", 5_000_000));

if (!target) {
  console.error(
    "Usage: npm run perf:probe -- --url=https://… [--samples=3] [--max-images=8] [--gate=true] [--max-hero-bytes=1000000] [--max-total-image-bytes=5000000] [--json=true]"
  );
  process.exit(2);
}

const requestHeaders = {
  accept: "text/html,application/xhtml+xml",
  "user-agent": "Mondescale-MSE-25.71-Performance-Probe/1.2",
};

const pageSamples = [];
for (let index = 0; index < samples; index += 1) {
  pageSamples.push(await timedFetch(target, { headers: requestHeaders }));
}
const page = pageSamples[0];
const html = Buffer.from(page.body).toString("utf8");
const hero = heroContract(html, page.response.url);
const allImages = imageUrls(html, page.response.url);
const inspectionUrls = [hero.url, ...allImages]
  .filter(Boolean)
  .filter((url, index, entries) => entries.indexOf(url) === index)
  .slice(0, maxImages);
const media = await Promise.all(inspectionUrls.map(inspectImage));
const heroMedia = hero.url ? media.find((item) => item.url === hero.url) || null : null;
const largestImages = [...media]
  .filter((item) => item.bytes)
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 5);
const totalBytesInspected = media.reduce((sum, item) => sum + (item.bytes || 0), 0);
const modernImages = media.filter((item) => item.modernFormat).length;
const cacheableImages = media.filter((item) => item.cacheable).length;
const uncacheableImages = media.filter((item) => item.status && !item.cacheable).length;
const origins = [...new Set(media.map((item) => item.origin).filter(Boolean))];
const sampleTtfbMs = pageSamples.map((item) => item.ttfbMs);
const sampleTotalMs = pageSamples.map((item) => item.totalMs);

const report = {
  target,
  finalUrl: page.response.url,
  status: page.response.status,
  page: {
    samples,
    coldTtfbMs: page.ttfbMs,
    medianTtfbMs: median(sampleTtfbMs),
    maxTtfbMs: Math.max(...sampleTtfbMs),
    medianTotalMs: median(sampleTotalMs),
    transferBytes: page.transferBytes,
    cacheControl: page.response.headers.get("cache-control"),
    contentEncoding: page.response.headers.get("content-encoding"),
    serverTiming: page.response.headers.get("server-timing"),
  },
  hero: {
    ...hero,
    media: heroMedia,
  },
  images: {
    discovered: allImages.length,
    inspected: media.length,
    totalBytesInspected,
    modernFormats: modernImages,
    cacheable: cacheableImages,
    uncacheable: uncacheableImages,
    origins,
    largest: largestImages,
  },
};

const failures = [];
if (!page.response.ok) failures.push(`HTTP ${page.response.status}`);
if (report.page.medianTtfbMs > maxTtfbMs) failures.push(`median TTFB ${report.page.medianTtfbMs}ms > ${maxTtfbMs}ms`);
if (!report.hero.present) failures.push("hero image not discoverable in initial HTML");
if (report.hero.present && !report.hero.highPriority) failures.push("hero image is not fetchPriority=high");
if (report.hero.present && (!report.hero.width || !report.hero.height)) failures.push("hero image has no intrinsic dimensions");
if (report.hero.present && !report.hero.url) failures.push("hero image has no resolvable src");
if (report.hero.media?.status && report.hero.media.status >= 400) failures.push(`hero image HTTP ${report.hero.media.status}`);
if ((report.hero.media?.bytes || 0) > maxHeroBytes) {
  failures.push(`hero image ${report.hero.media.bytes}B > ${maxHeroBytes}B`);
}
if ((largestImages[0]?.bytes || 0) > maxSingleImageBytes) {
  failures.push(`largest inspected image ${largestImages[0].bytes}B > ${maxSingleImageBytes}B`);
}
if (totalBytesInspected > maxTotalImageBytes) {
  failures.push(`inspected image payload ${totalBytesInspected}B > ${maxTotalImageBytes}B`);
}
report.gate = {
  enabled: gate,
  maxTtfbMs,
  maxHeroBytes,
  maxSingleImageBytes,
  maxTotalImageBytes,
  passed: failures.length === 0,
  failures,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("=== MSE-25.71 PUBLIC PERFORMANCE PROBE ===");
  console.log(`URL=${report.finalUrl}`);
  console.log(`HTTP=${report.status}`);
  console.log(`SAMPLES=${report.page.samples}`);
  console.log(`COLD_TTFB_MS=${report.page.coldTtfbMs}`);
  console.log(`MEDIAN_TTFB_MS=${report.page.medianTtfbMs}`);
  console.log(`MAX_TTFB_MS=${report.page.maxTtfbMs}`);
  console.log(`MEDIAN_TOTAL_MS=${report.page.medianTotalMs}`);
  console.log(`HTML_BYTES=${report.page.transferBytes}`);
  console.log(`CACHE_CONTROL=${report.page.cacheControl || "none"}`);
  console.log(`HERO_PRESENT=${report.hero.present}`);
  console.log(`HERO_HIGH_PRIORITY=${report.hero.highPriority}`);
  console.log(`HERO_EAGER=${report.hero.eager}`);
  console.log(`HERO_DIMENSIONS=${report.hero.width && report.hero.height}`);
  console.log(`HERO_URL=${report.hero.url || "none"}`);
  console.log(`HERO_BYTES=${report.hero.media?.bytes || 0}`);
  console.log(`HERO_TYPE=${report.hero.media?.type || "unknown"}`);
  console.log(`HERO_MODERN_FORMAT=${Boolean(report.hero.media?.modernFormat)}`);
  console.log(`HERO_CACHEABLE=${Boolean(report.hero.media?.cacheable)}`);
  console.log(`HERO_ORIGIN=${report.hero.media?.origin || "unknown"}`);
  console.log(`IMAGES_DISCOVERED=${report.images.discovered}`);
  console.log(`IMAGES_INSPECTED=${report.images.inspected}`);
  console.log(`IMAGE_BYTES_INSPECTED=${report.images.totalBytesInspected}`);
  console.log(`MODERN_IMAGES=${report.images.modernFormats}`);
  console.log(`CACHEABLE_IMAGES=${report.images.cacheable}`);
  console.log(`UNCACHEABLE_IMAGES=${report.images.uncacheable}`);
  console.log(`IMAGE_ORIGINS=${report.images.origins.join(",") || "none"}`);
  for (const [index, item] of report.images.largest.entries()) {
    console.log(
      `IMAGE_${index + 1}_BYTES=${item.bytes} TYPE=${item.type || "unknown"} MODERN=${Boolean(item.modernFormat)} CACHEABLE=${Boolean(item.cacheable)} CACHE=${item.cacheControl || "none"} ORIGIN=${item.origin || "unknown"} URL=${item.url}`
    );
  }
  if (gate) {
    console.log(`PERFORMANCE_GATE=${report.gate.passed ? "PASS" : "FAIL"}`);
    for (const failure of failures) console.log(`GATE_FAILURE=${failure}`);
  }
}

if (gate && failures.length) process.exitCode = 1;
else if (!page.response.ok) process.exitCode = 1;
