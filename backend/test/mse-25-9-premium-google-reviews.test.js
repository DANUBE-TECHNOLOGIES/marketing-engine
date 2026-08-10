"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.9 renders compact Google review cards with expandable details", () => {
  const renderer = source(
    "frontend/components/public-site/renderers/ReviewsRenderer.js"
  );

  assert.match(renderer, /compactText/);
  assert.match(renderer, /<details className="public-site-review-details">/);
  assert.match(renderer, /Lire l’avis complet/);
  assert.match(renderer, /Voir la réponse de l’agence/);
  assert.match(renderer, /public-site-review-google-mark/);
});

test("MSE-25.9 limits public Google review grids to premium responsive columns", () => {
  const css = source(
    "frontend/components/public-site/premium-public.css"
  );

  assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /public-site-review-details/);
  assert.match(css, /public-site-review-reply/);
  assert.match(css, /public-site-google-summary/);
});
