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
    /<PublicSiteSections[\s\S]*?page=\{previewPage\}[\s\S]*?site=\{site\}[\s\S]*?\/>/
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

test("MSE-25.3 reproduit la coque publique complète dans l'aperçu V2", () => {
  const preview = source(
    "components/page-builder-v2/PublicPagePreview.js"
  );

  assert.match(
    preview,
    /import PublicSiteHeader from ["']\.\.\/public-site\/PublicSiteHeader["']/
  );

  assert.match(
    preview,
    /import PublicSiteFooter from ["']\.\.\/public-site\/PublicSiteFooter["']/
  );

  assert.match(
    preview,
    /<PublicSiteHeader[\s\S]*?brandRuntime=\{brandRuntime\}[\s\S]*?site=\{site\}/
  );

  assert.match(
    preview,
    /<PublicSiteFooter site=\{site\} \/>/
  );

  assert.match(
    preview,
    /runtimeCssVariables\(brandRuntime\)/
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
