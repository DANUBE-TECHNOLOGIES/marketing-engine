"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.3 la preview V2 appelle le proxy d'hydratation sans perdre son fallback local", () => {
  const source = read(
    "frontend/components/page-builder-v2/PublicPagePreview.js"
  );

  assert.match(source, /\/api\/public-site-preview\/\$\{encodeURIComponent\(site\.slug\)\}/);
  assert.match(source, /method:\s*"POST"/);
  assert.match(source, /body:\s*JSON\.stringify\(\{ page \}\)/);
  assert.match(source, /setHydratedPage\(page \|\| null\)/);
  assert.match(source, /payload\?\.page/);
});

test("MSE-25.3 le proxy Next relaie vers public-site-read en no-store et sans tenant codé en dur", () => {
  const source = read(
    "frontend/app/api/public-site-preview/[siteSlug]/route.js"
  );

  assert.match(source, /public-site-read\/sites\/\$\{encodeURIComponent\(siteSlug\)\}\/preview-hydrate/);
  assert.match(source, /"Cache-Control":\s*"private, no-store"/);
  assert.match(source, /cache:\s*"no-store"/);
  assert.match(source, /"x-tenant-id"/);
  assert.match(source, /"x-tenant-slug"/);
  assert.doesNotMatch(
    source,
    /headers\.set\(\s*["']x-tenant-slug["']\s*,\s*["']mondescale["']/
  );
});

test("MSE-25.3 le menu de preview reprend les pages publiées et la page courante sur /agence", () => {
  const source = read(
    "frontend/components/page-builder-v2/PublicPagePreview.js"
  );

  assert.match(source, /function\s+previewNavigation\(/);
  assert.match(source, /`\/agence\/\$\{encodeURIComponent\(site\.slug\)\}`/);
  assert.match(source, /page\?\.id === currentPage\?\.id/);
  assert.match(source, /page\?\.status === "published"/);
  assert.match(source, /page\?\.published === true/);
  assert.match(source, /navigation,\s*hours/);
});
