"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.3 le catalogue agence et son renderer partagent les cinq toggles publics", () => {
  const catalog = source("frontend/lib/page-builder-v2/block-catalog.js");
  const renderer = source("frontend/components/public-site/renderers/AgencyV2Renderer.js");

  for (const property of [
    "showAddress",
    "showPhone",
    "showEmail",
    "showHours",
    "showMap",
  ]) {
    assert.match(catalog, new RegExp(`${property}:`));
    assert.match(renderer, new RegExp(`content\\.${property}`));
  }
});

test("MSE-25.3 le panneau V2 expose tous les toggles du bloc agence", () => {
  const editor = source("frontend/components/page-builder-v2/VisualPageBuilder.js");

  for (const property of [
    "showAddress",
    "showPhone",
    "showEmail",
    "showHours",
    "showMap",
  ]) {
    assert.match(
      editor,
      new RegExp(`set\\(["']${property}["']`),
      `Le panneau V2 doit permettre de modifier ${property}.`
    );
  }
});

test("MSE-25.3 les propriétés de mise en page du catalogue ne sont pas silencieusement perdues", () => {
  const catalog = source("frontend/lib/page-builder-v2/block-catalog.js");
  const editor = source("frontend/components/page-builder-v2/VisualPageBuilder.js");

  assert.match(catalog, /alignment:\s*["']left["']/);
  assert.match(catalog, /imagePosition:\s*["']left["']/);
  assert.match(catalog, /columns:\s*3/);

  // Ces contrôles constituent le contrat de clôture du Designer V2 :
  // une propriété configurable dans le catalogue doit être éditable.
  assert.match(editor, /set\(["']alignment["']/);
  assert.match(editor, /set\(["']imagePosition["']/);
  assert.match(editor, /set\(["']columns["']/);
});
