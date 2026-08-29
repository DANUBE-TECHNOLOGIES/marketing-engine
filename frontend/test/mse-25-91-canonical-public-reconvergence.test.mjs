import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.91 restores a guaranteed Mondescale header logo without clipping", () => {
  const source = read("components/public-site/PublicBrandLogo.js");
  const finalCss = read("components/public-site/mse-25-91-final-public-fixes.css");
  assert.match(source, /data-public-brand-logo="1"/);
  assert.match(source, /MONDESCALE_FALLBACK_LOGO = "\/brand\/logo-mondescale\.png"/);
  assert.match(source, /asset\.publicUrl/);
  assert.match(source, /site\?\.brandProfile\?\.assets/);
  assert.match(finalCss, /overflow: visible !important/);
  assert.match(finalCss, /transform: none !important/);
  assert.match(finalCss, /width: 150px !important/);
});

test("MSE-25.91 restores team portrait asset-object fallbacks on home and team page", () => {
  const source = read("components/public-site/renderers/TeamRenderer.js");
  assert.match(source, /function assetUrl/);
  assert.match(source, /member\.photoAsset/);
  assert.match(source, /member\.portraitAsset/);
  assert.match(source, /member\.profilePhoto/);
  assert.match(source, /site\?\.agency\?\.teamMembers/);
  assert.match(source, /Portrait de \$\{name\}/);
});

test("MSE-25.91 proxies backend media through the public frontend", () => {
  const config = read("next.config.js");
  assert.match(config, /source: "\/media\/assets\/:path\*"/);
  assert.match(config, /destination: `\$\{origin\}\/media\/assets\/:path\*`/);
  assert.match(config, /source: "\/media\/brand-assets\/:path\*"/);
  assert.match(config, /BACKEND_INTERNAL_URL/);
});

test("MSE-25.91 preserves home partner network and agency partner selection", () => {
  const source = read("components/public-site/renderers/PartnersRenderer.js");
  assert.match(source, /getCommonPartners/);
  assert.match(source, /NetworkPartnerGrid/);
  assert.match(source, /selectAgencyPartners/);
  assert.match(source, /Notre sélection principale/);
});

test("MSE-25.91 leaves immersive home hero geometry to the canonical MSE-25.77 experience and routes travel CTA to showcase", () => {
  const renderer = read("components/public-site/renderers/HeroV2Renderer.js");
  const css = read("components/public-site/mse-25-91-final-public-fixes.css");
  assert.match(renderer, /public-site-hero--immersive/);
  assert.match(renderer, /NETWORK_HOME_HERO_IMAGE/);
  assert.match(renderer, /getShowcaseUrl\(site\)/);
  assert.match(renderer, /Découvrir nos voyages/);
  assert.doesNotMatch(css, /public-site-hero--home/);
  assert.doesNotMatch(css, /max-height:\s*400px/);
});

test("MSE-25.91 exposes payment reassurance once and keeps Visa resilient", () => {
  const layout = read("app/agence/[siteSlug]/layout.js");
  const reassurance = read("components/public-site/PublicReassuranceBand.js");
  assert.doesNotMatch(layout, /PublicPaymentMethodsBand/);
  assert.match(reassurance, /id: "visa"/);
  assert.match(reassurance, /Visa_2021\.svg/);
  assert.match(reassurance, /fallback: "VISA"/);
});

test("MSE-25.91 uses the canonical backend service DNS", () => {
  const compose = read("../docker-compose.yml");
  assert.match(compose, /BACKEND_INTERNAL_URL: "http:\/\/backend:4000"/);
  assert.match(compose, /MONDESCALE_BACKEND_URL: "http:\/\/backend:4000"/);
  assert.doesNotMatch(compose, /BACKEND_INTERNAL_URL: "http:\/\/mle-backend:4000"/);
});

test("MSE-25.91 never emits bare mondescale.com showcase host", () => {
  const source = read("lib/showcase-url.js");
  assert.match(source, /https:\/\/www\.mondescale\.com/);
  assert.match(source, /url\.hostname = "www\.mondescale\.com"/);
});
