"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.3 le renderer agency respecte les toggles du Designer V2", () => {
  const source = read(
    "frontend/components/public-site/renderers/AgencyV2Renderer.js"
  );

  assert.match(source, /content\.showAddress !== false/);
  assert.match(source, /content\.showPhone !== false/);
  assert.match(source, /content\.showEmail !== false/);
  assert.match(source, /content\.showHours !== false/);
  assert.match(source, /content\.showMap === true/);
  assert.match(source, /site\?\.hours \|\| agency\?\.hours/);
  assert.match(source, /hours\?\.weekly/);
  assert.doesNotMatch(source, /hours\.today/);
});

test("MSE-25.3 le registry public utilise les renderers V2 agency et features", () => {
  const source = read(
    "frontend/components/public-site/renderers/registry.js"
  );

  assert.match(source, /import AgencyV2Renderer/);
  assert.match(source, /agency:\s*AgencyV2Renderer/);
  assert.match(source, /import FeaturesV2Renderer/);
  assert.match(source, /features:\s*FeaturesV2Renderer/);
});

test("MSE-25.3 le renderer features consomme l'introduction V2 sans casser la grille responsive", () => {
  const source = read(
    "frontend/components/public-site/renderers/FeaturesV2Renderer.js"
  );

  assert.match(source, /content\.introduction/);
  assert.match(source, /className="public-site-card-grid"/);
  assert.doesNotMatch(source, /gridTemplateColumns/);
});

test("MSE-25.3 les horaires sont disponibles en live et en preview", () => {
  const api = read("frontend/lib/public-site-api.js");
  const preview = read(
    "frontend/components/page-builder-v2/PublicPagePreview.js"
  );
  const proxy = read(
    "frontend/app/api/public-site-hours/[siteSlug]/route.js"
  );
  const layout = read(
    "frontend/app/agence/[siteSlug]/layout.js"
  );

  assert.match(api, /getPublicHours\(siteSlug\)/);
  assert.match(api, /\.\.\.site,\s*hours/);
  assert.match(preview, /\/api\/public-site-hours\/\$\{encodeURIComponent\(site\.slug\)\}/);
  assert.match(preview, /site=\{previewSite\}/);
  assert.match(preview, /hours=\{hours\}/);
  assert.match(proxy, /\/public\/agency-sites\/\$\{encodeURIComponent\(siteSlug\)\}\/hours/);
  assert.match(layout, /const hours = site\?\.hours \|\| null/);
  assert.doesNotMatch(layout, /getPublicHours/);
});
