import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/HeroV2Renderer.js"),
  "utf8",
);

test("MSE-25.191 hero CTA requires explicit label and either managed quote intent or explicit href", () => {
  assert.match(source, /function configuredHeroCta\(site, cta\)/);
  assert.match(source, /const label = String\(cta\?\.label \|\| ""\)\.trim\(\)/);
  assert.match(source, /if \(!label\) return null/);
  assert.match(source, /projectCtaLabel\(label\)/);
  assert.match(source, /quoteRequestHref\(site, \{ source: "general" \}\)/);
  assert.match(source, /const explicitHref = String\(cta\?\.href \|\| ""\)\.trim\(\)/);
  assert.match(source, /if \(!explicitHref\) return null/);
});

test("MSE-25.191 hero does not synthesize contact, destinations or showcase hrefs", () => {
  assert.match(source, /resolvePublicCtaHref\(site, explicitHref, ""\)/);
  assert.doesNotMatch(source, /resolvePublicCtaHref\(site, primaryCta\?\.href, "contact"/);
  assert.doesNotMatch(source, /resolvePublicCtaHref\(site, secondaryCta\.href, "destinations"/);
  assert.doesNotMatch(source, /resolvePublicCtaHref\(site, "contact", "contact"/);
  assert.doesNotMatch(source, /getShowcaseUrl/);
});

test("MSE-25.191 legacy button labels cannot create hero navigation", () => {
  assert.doesNotMatch(source, /content\.primaryButton/);
  assert.doesNotMatch(source, /content\.secondaryButton/);
});
