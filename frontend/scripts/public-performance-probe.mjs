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

function imageUrls(html, baseUrl) {
  const found = new Set();
  for (const match of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const resolved = absoluteUrl(baseUrl, match[1]);
    if (resolved) found.add(resolved);
  }
  return [...found];
}

function heroContract(html) {
  const hero = html.match(/<img\b[^>]*fetchpriority=["']high["'][^>]*>/i)?.[0]
    || html.match(/<img\b[^>]*loading=["']eager["'][^>]*>/i)?.[0]
    || "";
  return {
    present: Boolean(hero),
    highPriority: /fetchpriority=["']high["']/i.test(hero),
    eager: /loading=["']eager["']/i.test(hero),
    width: /\bwidth=["'][1-9][0-9]*["']/i.test(hero),
    height: /\bheight=["'][1-9][0-9]*["']/i.test(hero),
  };
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
    const result = await timedFetch(url, { headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8" } });
    return {
      url,
      status: result.response.status,
      bytes: result.transferBytes,
      type: result.response.headers.get("content-type"),
      cacheControl: result.response.headers.get("cache-control"),
      ttfbMs: result.ttfbMs,
      totalMs: result.totalMs,
    };
  } catch (error) {
    return { url, error: error.message };
  }
}

const target = arg("url", process.env.PUBLIC_PERFORMANCE_URL);
const maxImages = Math.max(1, Math.min(20, numberArg("max-images", 8)));
const json = arg("json", "false") === "true";
const gate = arg("gate", "false") === "true";
const maxTtfbMs = Math.max(100, numberArg("max-ttfb-ms", 1200));
const maxSingleImageBytes = Math.max(50_000, numberArg("max-single-image-bytes", 1_500_000));

if (!target) {
  console.error("Usage: npm run perf:probe -- --url=https://… [--max-images=8] [--gate=true] [--json=true]");
  process.exit(2);
}

const page = await timedFetch(target, {
  headers: {
    accept: "text/html,application/xhtml+xml",
    "user-agent": "Mondescale-MSE-25.71-Performance-Probe/1.0",
  },
});

const html = Buffer.from(page.body).toString("utf8");
const allImages = imageUrls(html, page.response.url);
const images = allImages.slice(0, maxImages);
const media = await Promise.all(images.map(inspectImage));
const largestImages = [...media]
  .filter((item) => item.bytes)
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 5);

const report = {
  target,
  finalUrl: page.response.url,
  status: page.response.status,
  page: {
    ttfbMs: page.ttfbMs,
    totalMs: page.totalMs,
    transferBytes: page.transferBytes,
    cacheControl: page.response.headers.get("cache-control"),
    contentEncoding: page.response.headers.get("content-encoding"),
    serverTiming: page.response.headers.get("server-timing"),
  },
  hero: heroContract(html),
  images: {
    discovered: allImages.length,
    inspected: media.length,
    totalBytesInspected: media.reduce((sum, item) => sum + (item.bytes || 0), 0),
    largest: largestImages,
  },
};

const failures = [];
if (!page.response.ok) failures.push(`HTTP ${page.response.status}`);
if (report.page.ttfbMs > maxTtfbMs) failures.push(`TTFB ${report.page.ttfbMs}ms > ${maxTtfbMs}ms`);
if (!report.hero.present) failures.push("hero image not discoverable in initial HTML");
if (report.hero.present && !report.hero.highPriority) failures.push("hero image is not fetchPriority=high");
if (report.hero.present && (!report.hero.width || !report.hero.height)) failures.push("hero image has no intrinsic dimensions");
if ((largestImages[0]?.bytes || 0) > maxSingleImageBytes) {
  failures.push(`largest inspected image ${largestImages[0].bytes}B > ${maxSingleImageBytes}B`);
}
report.gate = {
  enabled: gate,
  maxTtfbMs,
  maxSingleImageBytes,
  passed: failures.length === 0,
  failures,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("=== MSE-25.71 PUBLIC PERFORMANCE PROBE ===");
  console.log(`URL=${report.finalUrl}`);
  console.log(`HTTP=${report.status}`);
  console.log(`TTFB_MS=${report.page.ttfbMs}`);
  console.log(`TOTAL_MS=${report.page.totalMs}`);
  console.log(`HTML_BYTES=${report.page.transferBytes}`);
  console.log(`CACHE_CONTROL=${report.page.cacheControl || "none"}`);
  console.log(`HERO_PRESENT=${report.hero.present}`);
  console.log(`HERO_HIGH_PRIORITY=${report.hero.highPriority}`);
  console.log(`HERO_EAGER=${report.hero.eager}`);
  console.log(`HERO_DIMENSIONS=${report.hero.width && report.hero.height}`);
  console.log(`IMAGES_DISCOVERED=${report.images.discovered}`);
  console.log(`IMAGES_INSPECTED=${report.images.inspected}`);
  console.log(`IMAGE_BYTES_INSPECTED=${report.images.totalBytesInspected}`);
  for (const [index, item] of report.images.largest.entries()) {
    console.log(`IMAGE_${index + 1}_BYTES=${item.bytes} TYPE=${item.type || "unknown"} CACHE=${item.cacheControl || "none"} URL=${item.url}`);
  }
  if (gate) {
    console.log(`PERFORMANCE_GATE=${report.gate.passed ? "PASS" : "FAIL"}`);
    for (const failure of failures) console.log(`GATE_FAILURE=${failure}`);
  }
}

if (gate && failures.length) process.exitCode = 1;
else if (!page.response.ok) process.exitCode = 1;
