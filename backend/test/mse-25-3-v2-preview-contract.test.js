"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function frontendSource(relativePath) {
  return fs.readFileSync(
    path.resolve(__dirname, "../../frontend", relativePath),
    "utf8"
  );
}

test("MSE-25.3 fait déléguer la preview V2 au renderer public", () => {
  const preview = frontendSource(
    "components/page-builder-v2/PublicPagePreview.js"
  );
  const canvas = frontendSource(
    "components/page-builder-v2/PreviewCanvas.js"
  );

  assert.match(
    preview,
    /import PublicSiteSections from ["']\.\.\/public-site\/PublicSiteSections["']/
  );
  assert.match(
    preview,
    /<PublicSiteSections page=\{previewPage\} site=\{site\}/
  );
  assert.match(
    preview,
    /block\.status === ["']hidden["'] \? ["']hidden["'] : ["']draft["']/
  );

  assert.match(
    canvas,
    /import PublicPagePreview from ["']\.\/PublicPagePreview["']/
  );
  assert.match(
    canvas,
    /if \(previewMode\)/
  );
  assert.match(
    canvas,
    /<PublicPagePreview/
  );
});
