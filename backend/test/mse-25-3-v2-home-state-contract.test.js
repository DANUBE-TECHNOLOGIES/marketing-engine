"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.3 normalizePage préserve explicitement le slug vide de l'accueil", () => {
  const state = source(
    "frontend/lib/page-builder-v2/page-builder-state.js"
  );

  assert.match(state, /hasExplicitSlug/);
  assert.match(state, /Object\.prototype\.hasOwnProperty\.call\(page, "slug"\)/);
  assert.match(state, /slug:\s*hasExplicitSlug\s*\?\s*String\(page\.slug\)/);
});

test("MSE-25.3 serializePage garde le slug canonique sans valeur de remplacement", () => {
  const state = source(
    "frontend/lib/page-builder-v2/page-builder-state.js"
  );

  assert.match(state, /export function serializePage\(page\)/);
  assert.match(state, /slug:\s*page\.slug/);
  assert.doesNotMatch(state, /serializePage[\s\S]*slug:\s*page\.slug\s*\|\|/);
});
