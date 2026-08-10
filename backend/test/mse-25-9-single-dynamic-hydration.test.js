"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 public routes use one dynamic hydration pipeline", () => {
  const routes = read("backend/src/modules/public-site-read/routes.js");

  assert.match(routes, /hydratePublicDynamicBlocks/);
  assert.doesNotMatch(routes, /hydratePublicInspirations/);
  assert.match(routes, /dynamicHydration:\s*["']single-pipeline["']/);
});

test("MSE-25.9 preview uses the same single dynamic hydration pipeline", () => {
  const preview = read("backend/src/modules/public-site-read/preview-hydrator.js");

  assert.match(preview, /hydratePublicDynamicBlocks/);
  assert.doesNotMatch(preview, /hydratePublicInspirations/);
  assert.match(preview, /includeUnpublishedBlocks:\s*true/);
});

test("MSE-25.9 consolidated hydrator owns inspiration loading", () => {
  const hydrator = read("backend/src/modules/public-site-read/dynamic-block-hydrator.js");

  assert.match(hydrator, /function collectInspirationPlan/);
  assert.match(hydrator, /async function loadPublishedInspirations/);
  assert.match(hydrator, /function hydrateInspirationBlocks/);
  assert.match(hydrator, /publishedAt:\s*\{\s*not:\s*null\s*\}/);
  assert.match(hydrator, /tenantId/);
});
