import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/HeroV2Renderer.js"),
  "utf8",
);

test("MSE-25.174 hero fallback subtitle stays factual", () => {
  assert.match(source, /Retrouvez les informations publiées par votre agence de voyages/);
  assert.doesNotMatch(source, /Votre agence vous accompagne dans la création de vos plus beaux voyages/);
  assert.match(source, /resolvedHeroSubtitle\(\{ content, site \}\)/);
});

test("MSE-25.174 hero does not invent primary or secondary CTA labels", () => {
  assert.match(source, /configuredHeroCta\(site, content\.primaryCta\)/);
  assert.match(source, /configuredHeroCta\(site, content\.secondaryCta\)/);
  assert.doesNotMatch(source, /ctaLabel\(primaryCta, content\.primaryButton, "Demander un devis"\)/);
  assert.doesNotMatch(source, /immersiveNetworkHero \? "Découvrir nos voyages" : "Nous contacter"/);
});

test("MSE-25.174 hero allows only explicit targets or managed quote conversion", () => {
  assert.match(source, /if \(!label\) return null/);
  assert.match(source, /if \(projectCtaLabel\(label\)\) return \{ label, href: quoteRequestHref\(site, \{ source: "general" \}\) \}/);
  assert.match(source, /const explicitHref = String\(cta\?\.href \|\| ""\)\.trim\(\)/);
  assert.match(source, /if \(!explicitHref\) return null/);
  assert.match(source, /resolvePublicCtaHref\(site, explicitHref, ""\)/);
  assert.match(source, /\{primaryCta \|\| secondaryCta \? /);
});

test("MSE-25.174 no longer preserves legacy button-only CTA routes", () => {
  assert.doesNotMatch(source, /content\.primaryButton/);
  assert.doesNotMatch(source, /content\.secondaryButton/);
  assert.doesNotMatch(source, /getShowcaseUrl\(site\)/);
  assert.doesNotMatch(source, /resolvePublicCtaHref\(site, .*"contact"/);
  assert.doesNotMatch(source, /resolvePublicCtaHref\(site, .*"destinations"/);
});
