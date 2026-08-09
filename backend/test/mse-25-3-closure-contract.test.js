"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.3 clôture: V2 préserve la home canonique et la publication explicite", () => {
  const state = source(
    "frontend/lib/page-builder-v2/page-builder-state.js"
  );

  assert.match(state, /hasExplicitSlug/);
  assert.match(state, /slug:\s*page\.slug/);
  assert.match(state, /page\.status === "published"/);
  assert.match(state, /page\.status === "draft"/);
  assert.match(state, /page\.status === "review"/);
  assert.match(state, /page\.status === "archived"/);
});

test("MSE-25.3 clôture: le contrat public ne sert que des pages publiées sous /agence", () => {
  const service = source(
    "backend/src/modules/public-site-read/service.js"
  );

  assert.match(service, /publishedPages/);
  assert.match(service, /pages\.filter\([\s\S]*page\.published/);
  assert.match(service, /page\.slug === ""/);
  assert.match(service, /`\/agence\/\$\{site\.slug\}`/);
  assert.match(service, /navigation:/);
});

test("MSE-25.3 clôture: le Designer prévisualise avec le renderer public", () => {
  const editor = source(
    "frontend/components/page-builder-v2/VisualPageBuilder.js"
  );
  const preview = source(
    "frontend/components/page-builder-v2/PublicPagePreview.js"
  );

  assert.match(editor, /<PreviewCanvas/);
  assert.match(editor, /previewMode=\{previewMode\}/);
  assert.match(preview, /<PublicSiteSections/);
  assert.match(preview, /<PublicSiteHeader/);
  assert.match(preview, /<PublicSiteFooter/);
});

test("MSE-25.3 clôture: les blocs V2 passent par le registry public", () => {
  const registry = source(
    "frontend/components/public-site/renderers/registry.js"
  );

  for (const type of [
    "hero",
    "rich_text",
    "image_text",
    "features",
    "gallery",
    "cta",
    "agency",
    "destinations",
    "offers",
    "testimonials",
    "separator",
  ]) {
    assert.match(
      registry,
      new RegExp(`${type}:\\s*[A-Za-z0-9_]+Renderer`),
      `Le type ${type} doit être enregistré dans le renderer public.`
    );
  }
});

test("MSE-25.3 clôture: les liens CTA utilisent le résolveur public sécurisé", () => {
  const links = source(
    "frontend/components/public-site/renderers/ctaLinks.js"
  );
  const cta = source(
    "frontend/components/public-site/renderers/CtaV2Renderer.js"
  );
  const imageText = source(
    "frontend/components/public-site/renderers/ImageTextV2Renderer.js"
  );

  assert.match(links, /resolvePublicCtaHref/);
  assert.match(links, /javascript:/);
  assert.match(links, /data:/);
  assert.match(cta, /resolvePublicCtaHref/);
  assert.match(imageText, /resolvePublicCtaHref/);
});
