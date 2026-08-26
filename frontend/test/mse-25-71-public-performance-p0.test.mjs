import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");

function source(relativePath) {
  return fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");
}

test("public site data is revalidated instead of forced no-store", () => {
  const api = source("lib/public-site-api.js");
  assert.doesNotMatch(api, /cache:\s*["']no-store["']/);
  assert.match(api, /revalidate:\s*PUBLIC_DATA_REVALIDATE_SECONDS/);
  assert.match(api, /PUBLIC_SITE_REVALIDATE_SECONDS/);
});

test("public site RSC reads are memoized within a request and do not wait for hours", () => {
  const api = source("lib/public-site-api.js");
  assert.match(api, /import\s*\{\s*cache\s*\}\s*from\s*["']react["']/);
  assert.match(api, /const\s+getSite\s*=\s*cache\(/);
  assert.match(api, /const\s+getHome\s*=\s*cache\(/);
  assert.match(api, /const\s+getPage\s*=\s*cache\(/);
  assert.doesNotMatch(api, /getPublicHours/);
  assert.doesNotMatch(api, /hours,/);
});

test("public hours use the same persistent and request cache policy", () => {
  const hours = source("lib/public-hours-api.js");
  assert.match(hours, /import\s*\{\s*cache\s*\}\s*from\s*["']react["']/);
  assert.match(hours, /PUBLIC_SITE_REVALIDATE_SECONDS/);
  assert.match(hours, /revalidate:\s*PUBLIC_HOURS_REVALIDATE_SECONDS/);
  assert.match(hours, /getPublicHours\s*=\s*cache\(/);
  assert.doesNotMatch(hours, /cache:\s*["']no-store["']/);
});

test("brand runtime and legacy theme are cached within a request", () => {
  const runtime = source("lib/public-brand-legal-runtime.js");
  const legacy = source("lib/public-brand-api.js");

  assert.doesNotMatch(runtime, /cache:\s*["']no-store["']/);
  assert.match(runtime, /revalidate:\s*PUBLIC_RUNTIME_REVALIDATE_SECONDS/);
  assert.match(runtime, /import\s*\{\s*cache\s*\}\s*from\s*["']react["']/);
  assert.match(runtime, /fetchPublicBrandLegalRuntime\s*=\s*cache\(/);

  assert.match(legacy, /import\s*\{\s*cache\s*\}\s*from\s*["']react["']/);
  assert.match(legacy, /fetchPublicBrandTheme\s*=\s*cache\(/);
  assert.match(legacy, /revalidate:\s*300/);
});

test("agency route keeps only site and brand runtime on the layout critical path", () => {
  const layout = source("app/agence/[siteSlug]/layout.js");
  const header = source("components/public-site/PublicSiteHeader.js");
  const openingStatus = source("components/public-site/PublicOpeningStatus.js");
  const css = source("components/public-site/public-performance.css");

  assert.match(layout, /export const revalidate = 300/);
  assert.match(layout, /public-performance\.css/);
  assert.match(layout, /\[site, publicBrandLegalRuntime\]\s*=\s*await Promise\.all\(\[/);
  assert.match(layout, /publicSiteApi\.getSite\(siteSlug\)/);
  assert.match(layout, /fetchPublicBrandLegalRuntime\(siteSlug\)/);
  assert.doesNotMatch(layout, /getPublicHours/);
  assert.doesNotMatch(layout, /hours=/);
  assert.match(layout, /const hasRuntimeTheme = Object\.keys\(runtimeTheme\)\.length > 0/);
  assert.match(layout, /const legacyBrandTheme = hasRuntimeTheme \? null : await getPublicBrandTheme\(\)/);

  assert.match(header, /import\s*\{\s*Suspense\s*\}\s*from\s*["']react["']/);
  assert.match(header, /<Suspense\s+fallback=\{null\}>/);
  assert.match(header, /<PublicOpeningStatus\s+siteSlug=\{site\.slug\}\s*\/>/);
  assert.match(openingStatus, /getPublicHours\(siteSlug\)\.catch\(\(\) => null\)/);

  assert.match(css, /content-visibility:\s*auto/);
  assert.match(css, /contain-intrinsic-size:\s*auto 720px/);
  assert.match(css, /backdrop-filter:\s*none/);
});

test("hero LCP image preconnects, preloads and stays high priority", () => {
  const hero = source("components/public-site/renderers/HeroV2Renderer.js");
  assert.match(hero, /import\s*\{\s*preconnect,\s*preload\s*\}\s*from\s*["']react-dom["']/);
  assert.match(hero, /preconnect\(origin\)/);
  assert.match(hero, /preload\(backgroundImage,\s*\{/);
  assert.match(hero, /as:\s*["']image["']/);
  assert.match(hero, /fetchPriority:\s*["']high["']/);
  assert.match(hero, /loading=["']eager["']/);
  assert.match(hero, /width=["']1920["']/);
  assert.match(hero, /height=["']1080["']/);
  assert.doesNotMatch(hero, /decoding=["']async["']/);
});

test("legacy hero follows the same discoverable LCP strategy", () => {
  const sections = source("components/public-site/PublicSiteSections.js");
  assert.match(sections, /import\s*\{\s*preconnect,\s*preload\s*\}\s*from\s*["']react-dom["']/);
  assert.match(sections, /function\s+imageOrigin\(/);
  assert.match(sections, /preconnect\(origin\)/);
  assert.match(sections, /preload\(backgroundImage,\s*\{/);
  assert.match(sections, /data-has-hero-image=\{backgroundImage \? ["']true["'] : ["']false["']\}/);
  assert.match(sections, /className=["']public-site-hero-media["']/);
  assert.match(sections, /loading=["']eager["']/);
  assert.match(sections, /fetchPriority=["']high["']/);
  assert.match(sections, /width=["']1920["']/);
  assert.match(sections, /height=["']1080["']/);
  assert.doesNotMatch(sections, /backgroundImage:\s*`linear-gradient/);
});

test("non critical public media cannot compete with the hero LCP", () => {
  const logo = source("components/public-site/PublicBrandLogo.js");
  const destinations = source("components/public-site/renderers/DestinationsRenderer.js");
  const gallery = source("components/public-site/renderers/GalleryV2Renderer.js");
  const imageText = source("components/public-site/renderers/ImageTextV2Renderer.js");
  const team = source("components/public-site/renderers/TeamRenderer.js");
  const legacySections = source("components/public-site/PublicSiteSections.js");

  assert.match(logo, /fetchPriority=["']auto["']/);
  for (const renderer of [destinations, gallery, imageText, team]) {
    assert.match(renderer, /loading=["']lazy["']/);
    assert.match(renderer, /decoding=["']async["']/);
    assert.match(renderer, /fetchPriority=["']low["']/);
    assert.match(renderer, /width=["'][0-9]+["']/);
    assert.match(renderer, /height=["'][0-9]+["']/);
  }
  assert.match(legacySections, /loading=["']lazy["'] decoding=["']async["']/);
});
