"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 public header exposes the commercial showcase journey", () => {
  const header = source("frontend/components/public-site/PublicSiteHeader.js");
  const helper = source("frontend/lib/showcase-url.js");

  assert.match(header, /Découvrir nos voyages/);
  assert.match(header, /public-site-header-showcase/);
  assert.match(header, /getShowcaseUrl\(site\)/);
  assert.match(helper, /NEXT_PUBLIC_SHOWCASE_URL/);
});

test("MSE-25.9 legal pages get structured cards and a dedicated journey CTA", () => {
  const renderer = source("frontend/components/public-site/renderers/RichTextV2Renderer.js");
  const page = source("frontend/app/agence/[siteSlug]/[[...pageSlug]]/page.js");
  const layout = source("frontend/app/agence/[siteSlug]/layout.js");
  const styles = source("frontend/components/public-site/legal-experience.css");

  assert.match(renderer, /public-site-legal-grid/);
  assert.match(renderer, /Éditeur du site/);
  assert.match(renderer, /Données personnelles/);
  assert.match(page, /LegalJourneyCta/);
  assert.match(page, /data-public-page-kind=\{legalPage \? "legal" : "content"\}/);
  assert.match(page, /index:\s*!legalPage/);
  assert.match(layout, /legal-experience\.css/);
  assert.match(styles, /public-site-legal-journey-card/);
});

test("MSE-25.9 legal formatter preserves text, description and HTML line content", () => {
  const renderer = source("frontend/components/public-site/renderers/RichTextV2Renderer.js");

  assert.match(renderer, /\.\.\.textParagraphs\(content\.text\)/);
  assert.match(renderer, /\.\.\.textParagraphs\(content\.description\)/);
  assert.match(renderer, /\.\.\.paragraphs/);
});
