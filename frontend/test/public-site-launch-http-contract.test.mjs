import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const nextConfig = await readFile(new URL("../next.config.js", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/agence/[siteSlug]/layout.js", import.meta.url), "utf8");
const logoCss = await readFile(new URL("../components/public-site/logo-emphasis.css", import.meta.url), "utf8");
const legacyHome = await readFile(new URL("../app/sites/[siteSlug]/page.js", import.meta.url), "utf8");
const legacyPage = await readFile(new URL("../app/sites/[siteSlug]/[pageSlug]/page.js", import.meta.url), "utf8");

test("public launch surface receives safe response headers", () => {
  assert.match(nextConfig, /source: "\/agence\/:path\*"/);
  assert.match(nextConfig, /source: "\/sitemap\.xml"/);
  assert.match(nextConfig, /source: "\/robots\.txt"/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /strict-origin-when-cross-origin/);
});

test("public layout loads logo emphasis after premium styles", () => {
  const premiumIndex = layout.indexOf("premium-public.css");
  const logoIndex = layout.indexOf("logo-emphasis.css");
  assert.ok(premiumIndex >= 0);
  assert.ok(logoIndex > premiumIndex);
  assert.match(logoCss, /max-height: 86px !important/);
});

test("legacy /sites URLs permanently redirect to canonical /agence URLs", () => {
  assert.match(legacyHome, /permanentRedirect/);
  assert.match(legacyHome, /`\/agence\/\$\{encodeURIComponent/);
  assert.match(legacyPage, /permanentRedirect/);
  assert.match(legacyPage, /pageSlug/);
});
