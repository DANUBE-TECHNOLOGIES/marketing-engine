"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readFrontend(relativePath) {
  return fs.readFileSync(
    path.resolve(__dirname, "../../frontend", relativePath),
    "utf8"
  );
}

test("MSE-25.3 branche le bouton Aperçu V2 sur PreviewCanvas", () => {
  const source = readFrontend(
    "components/page-builder-v2/VisualPageBuilder.js"
  );

  assert.match(
    source,
    /import PreviewCanvas from "\.\/PreviewCanvas";/
  );
  assert.match(
    source,
    /<PreviewCanvas[\s\S]*previewMode=\{previewMode\}[\s\S]*page=\{activePage\}[\s\S]*site=\{site\}/
  );
  assert.match(source, /<BlockPreview block=\{block\} \/>/);
});

test("MSE-25.3 PreviewCanvas bascule vers la coque publique uniquement en mode aperçu", () => {
  const source = readFrontend(
    "components/page-builder-v2/PreviewCanvas.js"
  );

  assert.match(source, /if \(previewMode\)/);
  assert.match(source, /<PublicPagePreview/);
  assert.match(source, /return children;/);
});
