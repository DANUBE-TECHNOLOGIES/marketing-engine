"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.3 le registry public prend en charge les options de mise en page V2", () => {
  const registry = source(
    "frontend/components/public-site/renderers/registry.js"
  );

  assert.match(registry, /rich_text:\s*RichTextV2Renderer/);
  assert.match(registry, /image_text:\s*ImageTextV2Renderer/);
  assert.match(registry, /gallery:\s*GalleryV2Renderer/);
  assert.match(registry, /features:\s*FeaturesV2Renderer/);
});

test("MSE-25.3 respecte alignment dans le texte enrichi et le hero", () => {
  const richText = source(
    "frontend/components/public-site/renderers/RichTextV2Renderer.js"
  );
  const hero = source(
    "frontend/components/public-site/renderers/HeroV2Renderer.js"
  );

  assert.match(richText, /content\.alignment/);
  assert.match(richText, /textAlign:\s*alignment/);
  assert.match(hero, /content\.alignment/);
  assert.match(hero, /justifyContent:/);
});

test("MSE-25.3 respecte imagePosition sans casser la grille responsive", () => {
  const renderer = source(
    "frontend/components/public-site/renderers/ImageTextV2Renderer.js"
  );

  assert.match(renderer, /content\.imagePosition/);
  assert.match(renderer, /data-image-position=\{imagePosition\}/);
  assert.match(renderer, /repeat\(auto-fit, minmax\(280px, 1fr\)\)/);
});

test("MSE-25.3 respecte columns dans la galerie et les points forts", () => {
  const gallery = source(
    "frontend/components/public-site/renderers/GalleryV2Renderer.js"
  );
  const features = source(
    "frontend/components/public-site/renderers/FeaturesV2Renderer.js"
  );

  for (const renderer of [gallery, features]) {
    assert.match(renderer, /normalizeColumns\(content\.columns\)/);
    assert.match(renderer, /data-columns=\{columns\}/);
    assert.match(renderer, /repeat\(auto-fit, minmax/);
  }
});
