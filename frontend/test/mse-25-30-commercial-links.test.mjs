import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const renderer = fs.readFileSync(
  path.join(root, "components/public-site/renderers/FeaturesV2Renderer.js"),
  "utf8"
);

test("MSE-25.30 renders published feature item hrefs as crawlable links", () => {
  assert.match(renderer, /function featureHref/);
  assert.match(renderer, /function featureAction/);
  assert.match(renderer, /featureHref\(root, item\?\.href \|\| item\?\.url \|\| item\?\.link\)/);
  assert.match(renderer, /if \(href && label\) return \{ href, label \}/);
  assert.match(renderer, /return managedFeatureAction\(root, item\)/);
  assert.match(renderer, /<Link className="public-site-feature-action" href=\{action\.href\}>\{action\.label\}/);
  assert.doesNotMatch(renderer, /href: configuredHref \|\| `\$\{root\}\/contact`/);
  assert.doesNotMatch(renderer, /Parler de votre projet/);
});

test("MSE-25.30 permits only the explicit managed Business and Group feature routes", () => {
  assert.match(renderer, /const MANAGED_FEATURE_ACTIONS = Object\.freeze/);
  assert.match(renderer, /slug: "business-travel"/);
  assert.match(renderer, /slug: "voyages-en-groupe"/);
  assert.match(renderer, /MANAGED_FEATURE_ACTIONS\.find\(\(entry\) => entry\.pattern\.test\(searchable\)\)/);
  assert.doesNotMatch(renderer, /slugify|titleToSlug|labelToSlug/i);
  assert.doesNotMatch(renderer, /`\$\{root\}\/\$\{(?:item\?\.)?(?:title|label|name)/);
});

test("MSE-25.30 resolves relative Website Designer page slugs under the agency root", () => {
  assert.match(renderer, /return `\$\{root\}\/\$\{href\.replace/);
});
