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

test("le renderer public couvre les blocs cœur du Visual Builder V3", () => {
  const renderer = source("components/public-site/PublicSiteSections.js");

  for (const type of [
    "rich_text",
    "image_text",
    "features",
    "gallery",
    "agency",
  ]) {
    assert.match(
      renderer,
      new RegExp(type.replace("_", "[_-]")),
      `Le renderer public doit prendre en charge ${type}.`
    );
  }
});

test("la future preview V3 est déjà raccordée au renderer public et au runtime Brand Studio", () => {
  const preview = source("components/page-builder-v3/PagePreviewModal.js");

  assert.match(
    preview,
    /import\s+PublicSiteSections\s+from\s+["']\.\.\/public-site\/PublicSiteSections["']/,
    "La preview V3 doit importer le renderer public commun."
  );

  assert.match(
    preview,
    /<PublicSiteSections[\s\S]*?page=[\s\S]*?site=/,
    "La preview V3 doit rendre les sections avec PublicSiteSections."
  );

  assert.match(
    preview,
    /\/api\/public-brand-legal\/sites\//,
    "La preview V3 doit recharger le runtime Brand Studio du mini-site."
  );
});

test("la route V3 défectueuse est isolée derrière l’éditeur V2 opérationnel", () => {
  const page = source("app/website-builder/v3/[siteId]/page.js");

  assert.match(page, /permanentRedirect/);
  assert.match(page, /\/website-builder\/editor\//);
  assert.doesNotMatch(
    page,
    /VisualBuilderV3/,
    "La route V3 ne doit pas importer le composant corrompu tant qu'il n'est pas réparé."
  );
});
