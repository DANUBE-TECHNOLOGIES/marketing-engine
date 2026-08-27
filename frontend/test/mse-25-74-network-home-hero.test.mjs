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

test("MSE-25.74 gives every agency home an LCP-capable hero image fallback", () => {
  const hero = source("components/public-site/renderers/HeroV2Renderer.js");

  assert.match(hero, /const NETWORK_HOME_HERO_IMAGE\s*=/);
  assert.match(hero, /function resolvedHeroImage\(\{ content, page \}\)/);
  assert.match(hero, /return isHomePage\(page\) \? NETWORK_HOME_HERO_IMAGE : null/);
  assert.match(hero, /const backgroundImage = resolvedHeroImage\(\{ content, page \}\)/);
  assert.match(hero, /loading="eager"/);
  assert.match(hero, /fetchPriority="high"/);
});

test("MSE-25.74 keeps configured hero images authoritative over the network fallback", () => {
  const hero = source("components/public-site/renderers/HeroV2Renderer.js");

  assert.match(hero, /const configured = content\.backgroundImage \|\| content\.imageUrl \|\| null/);
  assert.match(hero, /if \(configured\) return configured/);
});

test("MSE-25.74 restores the full-bleed home hero instead of the split MSE-25.42 layout", () => {
  const layout = source("app/agence/[siteSlug]/layout.js");
  const css = source("components/public-site/network-home-hero.css");

  assert.match(layout, /network-home-hero\.css/);
  assert.match(css, /\.public-site-hero--home \.public-site-hero-media\s*\{[\s\S]*inset:\s*0/);
  assert.match(css, /width:\s*100%/);
  assert.match(css, /height:\s*100%/);
  assert.match(css, /object-fit:\s*cover/);
  assert.match(css, /\.public-site-hero--home \.public-site-hero-copy/);
});

test("MSE-25.74 standardizes home conversion CTAs across agencies", () => {
  const hero = source("components/public-site/renderers/HeroV2Renderer.js");

  assert.match(hero, /sitePageHref\(site, "contact"\)/);
  assert.match(hero, /sitePageHref\(site, "destinations"\)/);
  assert.match(hero, /"Demander un devis"/);
  assert.match(hero, /"Découvrir nos voyages"/);
});

test("MSE-25.74 final polish keeps the copy spacious and preserves the destination visual", () => {
  const hero = source("components/public-site/renderers/HeroV2Renderer.js");
  const css = source("components/public-site/network-home-hero.css");

  assert.match(hero, /const overlayStyle = homeHero/);
  assert.match(hero, /rgba\(7,29,48,0\.18\) 58%/);
  assert.match(hero, /rgba\(7,29,48,0\) 100%/);
  assert.match(css, /width:\s*min\(760px, 64%\)/);
  assert.match(css, /padding:\s*clamp\(34px, 4\.4vw, 56px\)/);
  assert.match(css, /max-width:\s*680px/);
  assert.match(css, /radial-gradient\(circle at 30% 48%/);
});
