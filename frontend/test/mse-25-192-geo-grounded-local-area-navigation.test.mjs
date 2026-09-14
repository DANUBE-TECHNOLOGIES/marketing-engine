import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/LocalSeoAreaLinks.js"),
  "utf8",
);

test("MSE-25.192 local area navigation comes only from published pages", () => {
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /\.filter\(\(page\) => pageSlug\(page\)\)/);
  assert.match(source, /pageHref\(site\.slug, page\)/);
  assert.match(source, /title: page\.title/);
});

test("MSE-25.192 local area navigation does not fabricate fixed routes", () => {
  assert.doesNotMatch(source, /`\/agence\/\$\{encodeURIComponent/);
  assert.doesNotMatch(source, /\/services`/);
  assert.doesNotMatch(source, /\/destinations`/);
  assert.doesNotMatch(source, /\/inspiration`/);
  assert.doesNotMatch(source, /\/contact`/);
});

test("MSE-25.192 local area section omits navigation when none is published", () => {
  assert.match(source, /const relatedPages = publishedLocalNavigation\(site\)/);
  assert.match(source, /\{relatedPages\.length \? \(/);
  assert.match(source, /relatedPages\.map\(\(page\) =>/);
});
