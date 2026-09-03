"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.3 expose les propriétés éditoriales restantes du catalogue V2", () => {
  const editor = source(
    "frontend/components/page-builder-v2/VisualPageBuilder.js"
  );

  for (const property of [
    "introduction",
    "limit",
    "source",
    "size",
    "line",
  ]) {
    assert.match(
      editor,
      new RegExp(`set\\([\"']${property}[\"']`),
      `Le Designer V2 doit permettre de modifier ${property}.`
    );
  }

  assert.match(editor, /Avis Google/);
  assert.match(editor, /Témoignages manuels/);
  assert.match(editor, /Afficher une ligne/);
});

test("MSE-25.3 applique la limite aux témoignages manuels comme aux avis Google", () => {
  const renderer = source(
    "frontend/components/public-site/renderers/TestimonialsRenderer.js"
  );

  assert.match(renderer, /normalizeLimit\(content\.limit\)/);
  assert.match(renderer, /content\.items\.slice\(0, limit\)/);
});

test("MSE-25.3 le séparateur public respecte taille et ligne", () => {
  const renderer = source(
    "frontend/components/public-site/renderers/SeparatorRenderer.js"
  );

  assert.match(renderer, /content\.size/);
  assert.match(renderer, /content\.line/);
  assert.match(renderer, /small:/);
  assert.match(renderer, /medium:/);
  assert.match(renderer, /large:/);
});
