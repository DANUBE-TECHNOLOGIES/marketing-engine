import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const renderer = fs.readFileSync(
  path.join(root, "components/public-site/renderers/FeaturesV2Renderer.js"),
  "utf8"
);

test("MSE-25.30 renders feature item hrefs as crawlable internal links", () => {
  assert.match(renderer, /function featureHref/);
  assert.match(renderer, /const href = featureHref\(root, item\.href\)/);
  assert.match(renderer, /<Link href=\{href\}>\{heading\}<\/Link>/);
});

test("MSE-25.30 resolves relative Website Designer page slugs under the agency root", () => {
  assert.match(renderer, /return `\$\{root\}\/\$\{href\.replace/);
});
