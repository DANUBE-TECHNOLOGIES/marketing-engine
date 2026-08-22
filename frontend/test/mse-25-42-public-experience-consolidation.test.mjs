import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

test("MSE-25.42 keeps the flexible payment block compact and contrasted", () => {
  const css = read("components/public-site/premium-sections.css");

  assert.match(css, /public-site-flexible-payment--compact/);
  assert.match(css, /padding-block:\s*clamp\(34px/);
  assert.match(css, /public-site-shell \.public-site-cta/);
  assert.match(css, /color:\s*#fff/);
});

test("MSE-25.42 reduces destination and team visual height without hiding content", () => {
  const css = read("components/public-site/premium-sections.css");

  assert.match(css, /public-site-destination-card[\s\S]*min-height:\s*315px/);
  assert.match(css, /public-site-team-portrait[\s\S]*clamp\(160px/);
  assert.match(css, /public-site-shell \.public-site-section[\s\S]*padding-block:\s*clamp\(48px/);
});

test("MSE-25.42 presents internal links as secondary editorial navigation", () => {
  const css = read("components/public-site/public-readability-fixes.css");

  assert.match(css, /\.public-site-related-links a[\s\S]*font-size:\s*0\.78rem/);
  assert.match(css, /text-decoration:\s*none/);
  assert.match(css, /:focus-visible/);
});

test("MSE-25.42 compacts the home local coverage instead of duplicating a long SEO section", () => {
  const source = read("components/public-site/LocalSeoAreaLinks.js");

  assert.match(source, /public-site-local-area-compact/);
  assert.match(source, /Votre agence à \{city\} et ses environs/);
  assert.match(source, /Nos services/);
  assert.doesNotMatch(source, /Notre secteur de proximité s’étend également/);
});

test("MSE-25.42 public renderers keep media-aware destination and team contracts", () => {
  const destinations = read("components/public-site/renderers/DestinationsRenderer.js");
  const team = read("components/public-site/renderers/TeamRenderer.js");

  assert.match(destinations, /item\.imageUrl/);
  assert.match(destinations, /item\.heroImage/);
  assert.match(team, /member\.imageUrl/);
  assert.match(team, /member\.photoUrl/);
});

test("MSE-25.42 keeps hydrated public-site-read media ahead of the raw canonical fallback", () => {
  const route = read("app/api/public-sites/[[...path]]/route.js");

  assert.match(
    route,
    /const\s+selectedPage\s*=\s*legacySelectedPage\s*\|\|\s*\(canonicalMatchesRequest\s*\?\s*canonicalPage\s*:\s*null\)/
  );
  assert.match(route, /public-site-read is the canonical PUBLIC rendering contract/);
});

test("MSE-25.42 gives the hero a responsive image-to-brand fade", () => {
  const hero = read("components/public-site/renderers/HeroV2Renderer.js");
  const css = read("components/public-site/premium-sections.css");

  assert.match(hero, /public-site-hero--immersive/);
  assert.match(hero, /public-site-hero-fade/);
  assert.match(css, /\.public-site-hero--immersive \.public-site-hero-fade/);
  assert.match(css, /linear-gradient\(90deg[\s\S]*var\(--public-primary\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*linear-gradient\(180deg/);
});

test("MSE-25.42 removes redundant conversion bands from the home only", () => {
  const cta = read("components/public-site/renderers/CtaV2Renderer.js");

  assert.match(cta, /function\s+isHomePage/);
  assert.match(cta, /if\s*\(isHomePage\(page\)\)\s*return\s+null/);
  assert.match(cta, /public-site-cta/);
});

test("MSE-25.42 removes the generic Accueil rich-text block without hiding useful rich text", () => {
  const richText = read("components/public-site/renderers/RichTextV2Renderer.js");

  assert.match(richText, /function\s+isGenericHomeIntro/);
  assert.match(richText, /\["accueil",\s*"bienvenue",\s*"home"\]/);
  assert.match(richText, /if\s*\(isGenericHomeIntro\(section, page\)\)\s*return\s+null/);
  assert.match(richText, /public-site-rich-text/);
});

test("MSE-25.42 avoids duplicating the full agency profile on the home", () => {
  const agency = read("components/public-site/renderers/AgencyV2Renderer.js");

  assert.match(agency, /function\s+isHomePage/);
  assert.match(agency, /if\s*\(isHomePage\(page\)\)\s*return\s+null/);
  assert.match(agency, /public-site-agency-section/);
});

test("MSE-25.42 turns a single advisor into an editorial team presentation", () => {
  const team = read("components/public-site/renderers/TeamRenderer.js");
  const css = read("components/public-site/premium-sections.css");

  assert.match(team, /const\s+singleMember\s*=\s*uniqueMembers\.length\s*===\s*1/);
  assert.match(team, /public-site-team-grid--single/);
  assert.match(css, /\.public-site-team-grid--single \.public-site-team-card[\s\S]*grid-template-columns:\s*230px minmax\(0, 1fr\)/);
});

test("MSE-25.42 normalizes the legacy home FAQ title", () => {
  const faq = read("components/public-site/renderers/FaqRenderer.js");

  assert.match(faq, /function\s+resolvedFaqTitle/);
  assert.match(faq, /questions\\s\+fr\[eé\]quentes/);
  assert.match(faq, /defaultFaqTitle\(site\)/);
});

test("MSE-25.42 defaults the home to three Google reviews while preserving explicit limits", () => {
  const reviews = read("components/public-site/renderers/ReviewsRenderer.js");

  assert.match(reviews, /function\s+reviewLimit/);
  assert.match(reviews, /return\s+isHomePage\(page\)\s*\?\s*3\s*:\s*6/);
  assert.match(reviews, /Number\.isFinite\(configured\)[\s\S]*return configured/);
  assert.match(reviews, /getPublicReviews\(site\.slug, reviewLimit\(content, page\)\)/);
});
