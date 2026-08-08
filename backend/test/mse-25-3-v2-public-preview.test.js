"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function source(relativePath) {
  return fs.readFileSync(
    path.resolve(__dirname, "../../frontend", relativePath),
    "utf8"
  );
}

test("MSE-25.3 fournit au Designer V2 un aperçu basé sur le renderer public", () => {
  const preview = source(
    "components/page-builder-v2/PublicPagePreview.js"
  );

  assert.match(
    preview,
    /import PublicSiteSections from ["']\.\.\/public-site\/PublicSiteSections["']/
  );

  assert.match(
    preview,
    /<PublicSiteSections page=\{previewPage\} site=\{site\} \/>/
  );

  assert.match(
    preview,
    /__builderType:\s*block\.type/
  );

  assert.match(
    preview,
    /public-brand-legal\/sites/
  );
});

test("MSE-25.3 conserve les blocs masqués hors de l'aperçu public V2", () => {
  const preview = source(
    "components/page-builder-v2/PublicPagePreview.js"
  );

  assert.match(
    preview,
    /block\.status === ["']hidden["'] \? ["']hidden["'] : ["']draft["']/
  );
});
