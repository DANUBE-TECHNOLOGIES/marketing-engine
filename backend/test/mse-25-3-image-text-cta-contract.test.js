"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.3 Image+Texte expose son CTA via le contrat primaryCta du Designer V2", () => {
  const catalog = source(
    "frontend/lib/page-builder-v2/block-catalog.js"
  );
  const editor = source(
    "frontend/components/page-builder-v2/VisualPageBuilder.js"
  );

  assert.match(catalog, /type:\s*"image_text"[\s\S]*primaryCta:\s*\{/);
  assert.match(editor, /content\.primaryCta/);
  assert.match(editor, /set\("primaryCta"/);
});

test("MSE-25.3 le renderer Image+Texte reste rétrocompatible avec l'ancien champ cta", () => {
  const renderer = source(
    "frontend/components/public-site/renderers/ImageTextV2Renderer.js"
  );

  assert.match(renderer, /content\.cta\s*\|\|\s*content\.primaryCta/);
  assert.match(renderer, /cta\?\.label/);
  assert.match(renderer, /resolvePublicCtaHref/);
});
