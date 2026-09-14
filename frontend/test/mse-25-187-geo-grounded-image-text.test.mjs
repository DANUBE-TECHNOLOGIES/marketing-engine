import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../components/public-site/renderers/ImageTextV2Renderer.js", import.meta.url),
  "utf8"
);

test("MSE-25.187 image-text CTA requires an explicit published href", () => {
  assert.match(source, /function explicitCtaHref\(site, cta\)/);
  assert.match(source, /if \(!href \|\| \/\^\(javascript:\|data:\|vbscript:\)\/i\.test\(href\)\) return null;/);
  assert.match(source, /const ctaHref = explicitCtaHref\(site, cta\);/);
  assert.match(source, /ctaLabel && ctaHref/);
  assert.doesNotMatch(source, /resolvePublicCtaHref\([\s\S]*cta\.href,[\s\S]*"contact"/);
});

test("MSE-25.187 image-text does not fabricate missing media", () => {
  assert.doesNotMatch(source, /public-site-image-placeholder/);
  assert.match(source, /if \(!imageUrl && !hasCopy\) return null;/);
  assert.match(source, /\{imageUrl \? \(/);
});
