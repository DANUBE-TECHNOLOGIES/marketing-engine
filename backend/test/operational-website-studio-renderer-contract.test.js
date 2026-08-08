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

test("la preview V3 utilise le renderer public et le runtime Brand Studio", () => {
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

test("la route V3 charge le design system public", () => {
  const page = source("app/website-builder/v3/[siteId]/page.js");

  assert.match(page, /public-site\.css/);
  assert.match(page, /brand-runtime\.css/);
});
