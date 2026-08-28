"use strict";

/**
 * MSE-25.86 — public media & accessibility hygiene gate.
 *
 * Read-only crawl of every sitemap URL. The gate protects low-level UX signals
 * that can regress without breaking HTTP/indexation: document language,
 * viewport, duplicate ids, image alternative text, reserved image geometry,
 * HTTPS media and excessive eager/high-priority image loading.
 *
 * This is deliberately not a Lighthouse/Core Web Vitals substitute. It checks
 * deterministic HTML invariants only and performs no Google/CMS/database write.
 */

const PUBLIC_ORIGIN = String(
  process.env.PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
).replace(/\/+$/g, "");

const EXPECTED_COUNT = Number.parseInt(
  process.env.MSE_25_86_EXPECTED_SITEMAP_COUNT || "0",
  10
);

const CONCURRENCY = Math.max(
  1,
  Math.min(12, Number.parseInt(process.env.MSE_25_86_CONCURRENCY || "4", 10) || 4)
);

const TIMEOUT_MS = Math.max(
  1000,
  Number.parseInt(process.env.MSE_25_86_TIMEOUT_MS || "15000", 10) || 15000
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

function attr(tag, name) {
  const escaped = String(name || "").replace(/[^a-z0-9:_-]/gi, "");
  if (!escaped) return null;
  const quoted = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  if (quoted) return quoted[2];
  const unquoted = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*([^\\s>]+)`, "i"));
  return unquoted ? unquoted[1] : null;
}

function hasAttr(tag, name) {
  const escaped = String(name || "").replace(/[^a-z0-9:_-]/gi, "");
  return Boolean(escaped && new RegExp(`\\b${escaped}(?:\\s*=|\\s|/?>)`, "i").test(tag));
}

function imageTags(html) {
  return String(html || "").match(/<img\b[^>]*>/gi) || [];
}

function hasReservedGeometry(tag) {
  const width = attr(tag, "width");
  const height = attr(tag, "height");
  if (width && height && Number.parseFloat(width) > 0 && Number.parseFloat(height) > 0) return true;

  const dataNimg = String(attr(tag, "data-nimg") || "").toLowerCase();
  if (dataNimg === "fill") return true;

  const style = String(attr(tag, "style") || "").toLowerCase();
  if (/\baspect-ratio\s*:/.test(style)) return true;

  return false;
}

function duplicateIds(html) {
  const counts = new Map();
  const tags = String(html || "").match(/<[a-z][^>]*\bid\s*=\s*["'][^"']+["'][^>]*>/gi) || [];
  for (const tag of tags) {
    const id = attr(tag, "id");
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

function htmlLanguage(html) {
  const match = String(html || "").match(/<html\b[^>]*>/i);
  return match ? String(attr(match[0], "lang") || "").toLowerCase() : "";
}

function hasViewportMeta(html) {
  const metas = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  return metas.some((tag) => String(attr(tag, "name") || "").toLowerCase() === "viewport" && Boolean(attr(tag, "content")));
}

function inspectHtml({ url, html, status = 200 }) {
  const images = imageTags(html);
  const missingAlt = images.filter((tag) => !hasAttr(tag, "alt"));
  const missingGeometry = images.filter((tag) => !hasReservedGeometry(tag));
  const insecureMedia = images.filter((tag) => /^http:\/\//i.test(String(attr(tag, "src") || "")));
  const highPriority = images.filter((tag) => String(attr(tag, "fetchpriority") || "").toLowerCase() === "high");
  const eager = images.filter((tag) => String(attr(tag, "loading") || "").toLowerCase() === "eager");
  const ids = duplicateIds(html);
  const lang = htmlLanguage(html);
  const viewport = hasViewportMeta(html);
  const issues = [];

  if (status !== 200) issues.push(`http-${status}`);
  if (!(lang === "fr" || lang.startsWith("fr-"))) issues.push(`document-lang-${lang || "missing"}`);
  if (!viewport) issues.push("missing-viewport");
  if (ids.length) issues.push(`duplicate-ids:${ids.slice(0, 5).join(",")}`);
  if (missingAlt.length) issues.push(`images-missing-alt:${missingAlt.length}`);
  if (missingGeometry.length) issues.push(`images-missing-geometry:${missingGeometry.length}`);
  if (insecureMedia.length) issues.push(`insecure-image-src:${insecureMedia.length}`);
  if (highPriority.length > 1) issues.push(`too-many-high-priority-images:${highPriority.length}`);
  if (eager.length > 1) issues.push(`too-many-eager-images:${eager.length}`);

  return {
    url,
    status,
    lang,
    viewport,
    imageCount: images.length,
    missingAltCount: missingAlt.length,
    missingGeometryCount: missingGeometry.length,
    insecureMediaCount: insecureMedia.length,
    highPriorityCount: highPriority.length,
    eagerCount: eager.length,
    duplicateIds: ids,
    issues,
    ok: issues.length === 0,
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mondescale-MSE-25.86-Media-A11y-Gate/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { response, text: await response.text() };
}

async function inspectUrl(url) {
  try {
    const { response, text } = await fetchText(url);
    return inspectHtml({ url, html: text, status: response.status });
  } catch (error) {
    return {
      url,
      status: 0,
      lang: "",
      viewport: false,
      imageCount: 0,
      missingAltCount: 0,
      missingGeometryCount: 0,
      insecureMediaCount: 0,
      highPriorityCount: 0,
      eagerCount: 0,
      duplicateIds: [],
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

function summarize(results) {
  const failures = results.filter((item) => !item.ok);
  return {
    urlCount: results.length,
    failureCount: failures.length,
    imageCount: results.reduce((sum, item) => sum + item.imageCount, 0),
    missingAltCount: results.reduce((sum, item) => sum + item.missingAltCount, 0),
    missingGeometryCount: results.reduce((sum, item) => sum + item.missingGeometryCount, 0),
    insecureMediaCount: results.reduce((sum, item) => sum + item.insecureMediaCount, 0),
    duplicateIdPages: results.filter((item) => item.duplicateIds.length > 0).length,
    languageOkCount: results.filter((item) => item.lang === "fr" || item.lang.startsWith("fr-")).length,
    viewportOkCount: results.filter((item) => item.viewport).length,
    priorityOkCount: results.filter((item) => item.highPriorityCount <= 1 && item.eagerCount <= 1).length,
    failures,
  };
}

async function main() {
  const sitemapUrl = `${PUBLIC_ORIGIN}/sitemap.xml`;
  const { response, text: xml } = await fetchText(sitemapUrl);
  if (!response.ok) throw new Error(`SITEMAP_HTTP_${response.status}`);

  const urls = sitemapUrls(xml);
  if (!urls.length) throw new Error("PUBLIC_SITEMAP_EMPTY");
  if (new Set(urls).size !== urls.length) throw new Error("PUBLIC_SITEMAP_DUPLICATE_URLS");
  if (EXPECTED_COUNT > 0 && urls.length !== EXPECTED_COUNT) {
    throw new Error(`PUBLIC_SITEMAP_COUNT_MISMATCH expected=${EXPECTED_COUNT} actual=${urls.length}`);
  }

  const results = await mapConcurrent(urls, inspectUrl);
  const summary = summarize(results);

  console.log("================================================");
  console.log("=== MSE-25.86 - PUBLIC MEDIA & A11Y ============");
  console.log("================================================");
  console.log(`PUBLIC=${PUBLIC_ORIGIN}`);
  console.log(`SITEMAP=${urls.length}`);
  console.log(`DOCUMENT_LANG_FR=${summary.languageOkCount}/${urls.length}`);
  console.log(`VIEWPORT_PRESENT=${summary.viewportOkCount}/${urls.length}`);
  console.log(`IMAGES_TOTAL=${summary.imageCount}`);
  console.log(`IMAGES_MISSING_ALT=${summary.missingAltCount}`);
  console.log(`IMAGES_MISSING_GEOMETRY=${summary.missingGeometryCount}`);
  console.log(`INSECURE_IMAGE_SRC=${summary.insecureMediaCount}`);
  console.log(`DUPLICATE_ID_PAGES=${summary.duplicateIdPages}`);
  console.log(`IMAGE_PRIORITY_DISCIPLINE=${summary.priorityOkCount}/${urls.length}`);
  console.log("GOOGLE_WRITES=0");
  console.log("CMS_WRITES=0");
  console.log("DATABASE_WRITES=0");

  if (summary.failureCount > 0) {
    console.error(`PUBLIC_MEDIA_A11Y_FAILURES=${summary.failureCount}`);
    for (const failure of summary.failures.slice(0, 40)) {
      console.error(`${failure.url} :: ${failure.issues.join(",")}`);
      if (failure.error) console.error(`  ${failure.error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PUBLIC_MEDIA_A11Y_FAILURES=0");
  console.log("MSE-25.86=PASS");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("================================================");
    console.error("=== MSE-25.86 - FAIL ==========================");
    console.error("================================================");
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  attr,
  duplicateIds,
  hasAttr,
  hasReservedGeometry,
  hasViewportMeta,
  htmlLanguage,
  imageTags,
  inspectHtml,
  mapConcurrent,
  sitemapUrls,
  summarize,
};
