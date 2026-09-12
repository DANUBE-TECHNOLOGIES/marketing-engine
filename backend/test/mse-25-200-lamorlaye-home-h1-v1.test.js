"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../scripts/mse-25-200-lamorlaye-home-h1-v1.js"), "utf8");

test("MSE-25.200 targets Lamorlaye Home hero H1 only", () => {
  assert.match(source, /mondescale-lamorlaye/);
  assert.ok(source.includes('const TARGET_H1 = "Agence de voyages à Lamorlaye"'));
  assert.match(source, /nombre de heroes visibles inattendu/);
  assert.match(source, /content: \{ \.\.\.content, title: TARGET_H1 \}/);
});

test("MSE-25.200 preserves SEO metadata and public topology", () => {
  assert.match(source, /seoTitleUnchanged: true/);
  assert.match(source, /metaDescriptionUnchanged: true/);
  assert.match(source, /pageH1Unchanged: true/);
  assert.match(source, /routeFingerprintUnchanged: true/);
  assert.match(source, /protectedContentUnchanged: true/);
  assert.match(source, /pageWrites: 0/);
  assert.match(source, /routeWrites: 0/);
  assert.match(source, /networkWrites: 0/);
});

test("MSE-25.200 is dry-run first and reversible", () => {
  assert.match(source, /MSE_25_200_CONFIRM/);
  assert.match(source, /MSE_25_200_ROLLBACK/);
  assert.match(source, /mode: "DRY_RUN"/);
  assert.match(source, /fs\.writeFileSync\(SNAPSHOT_PATH/);
  assert.match(source, /await rollback\(site\)/);
});

test("MSE-25.200 does not alter routes, pages, canonical or indexation", () => {
  assert.doesNotMatch(source, /agencyPage\.update/);
  assert.doesNotMatch(source, /page\.update/);
  assert.doesNotMatch(source, /canonical/i);
  assert.doesNotMatch(source, /sitemap/i);
  assert.doesNotMatch(source, /indexation/i);
  assert.doesNotMatch(source, /fetch\(/);
});
