import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.73 scopes root-relative public CTAs to the agency site", () => {
  const source = read("components/public-site/renderers/ctaLinks.js");

  assert.match(source, /isAgencyScopedPublicPath/);
  assert.match(source, /sitePageHref\(site, value\)/);
  assert.match(source, /site\?\.basePath/);
});

test("MSE-25.73 resolves legacy destination links to agency destination routes", () => {
  const source = read("components/public-site/renderers/DestinationsRenderer.js");

  assert.match(source, /legacyDestination/);
  assert.match(source, /\/destination\//);
  assert.doesNotMatch(source, /href=\{item\.href\}/);
});

test("MSE-25.73 keeps inspiration related links on the canonical singular route", () => {
  const source = read("components/public-site/renderers/DestinationsRenderer.js");
  assert.match(source, /`\$\{root\}\/inspiration`/);
  assert.doesNotMatch(source, /`\$\{root\}\/inspirations`/);
});
