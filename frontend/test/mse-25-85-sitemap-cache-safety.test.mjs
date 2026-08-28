import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sitemapSource = fs.readFileSync(new URL("../app/sitemap.js", import.meta.url), "utf8");
const clientSource = fs.readFileSync(new URL("../lib/minisite-structured-data/client.js", import.meta.url), "utf8");

test("MSE-25.85 sitemap output is dynamic and never cached as an empty warm-up result", () => {
  assert.match(sitemapSource, /export const dynamic\s*=\s*[\s\S]*?"force-dynamic"/);
  assert.match(sitemapSource, /export const revalidate\s*=\s*[\s\S]*?0/);
  assert.match(sitemapSource, /if \(payload\?\.error\)/);
  assert.match(sitemapSource, /MINISITE_SITEMAP_UNAVAILABLE/);
});

test("MSE-25.85 sitemap backend fetch bypasses Next data cache", () => {
  const sitemapFn = clientSource.split("export async function fetchMiniSiteSitemap")[1] || "";
  assert.match(sitemapFn, /cache:\s*"no-store"/);
  assert.doesNotMatch(sitemapFn, /revalidate:\s*300/);
});

test("MSE-25.85 backend sitemap failures remain explicit", () => {
  const sitemapFn = clientSource.split("export async function fetchMiniSiteSitemap")[1] || "";
  assert.match(sitemapFn, /BACKEND_TIMEOUT/);
  assert.match(sitemapFn, /BACKEND_UNREACHABLE/);
  assert.match(sitemapFn, /BACKEND_HTTP_/);
  assert.match(sitemapFn, /BACKEND_INVALID_JSON/);
});
