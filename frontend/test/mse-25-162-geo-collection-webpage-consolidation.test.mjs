import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const helper = read("lib/seo/collection-webpage-schema.js");
const genericRoute = read("app/agence/[siteSlug]/[[...pageSlug]]/page.js");
const inspirationRoute = read("app/agence/[siteSlug]/inspiration/page.js");
const destinationRenderer = read("components/public-site/renderers/DestinationsRenderer.js");

test("MSE-25.162 consolidates only a CollectionPage fragment with the same canonical WebPage id", () => {
  assert.match(helper, /schema\?\.\["@id"\] === webPage\["@id"\]/);
  assert.match(helper, /hasType\(schema, "CollectionPage"\)/);
  assert.match(helper, /mainEntity: fragment\.mainEntity/);
  assert.match(helper, /schemas: entries\.filter/);
});

test("MSE-25.162 destination collection mainEntity is attached by the route and renderer emits no duplicate WebPage", () => {
  assert.match(genericRoute, /buildDestinationCollectionSchemas/);
  assert.match(genericRoute, /consolidateCollectionWebPage\(/);
  assert.match(genericRoute, /remainingDestinationSchemas\.map/);
  assert.doesNotMatch(destinationRenderer, /JsonLd|buildDestinationCollectionSchemas/);
});

test("MSE-25.162 inspiration collection renders one canonical WebPage plus the remaining ItemList", () => {
  assert.match(inspirationRoute, /const collectionGraph = consolidateCollectionWebPage\(baseWebPage, collectionSchemas\)/);
  assert.match(inspirationRoute, /<JsonLd data=\{webPage\} \/>/);
  assert.match(inspirationRoute, /remainingCollectionSchemas\.map/);
  assert.doesNotMatch(inspirationRoute, /collectionSchemas\.map\(\(schema\)/);
});

test("MSE-25.162 does not introduce transactional or inferred expertise claims", () => {
  const combined = `${helper}\n${genericRoute}\n${inspirationRoute}`;
  assert.doesNotMatch(combined, /aggregateRating|price|availability|stock|booking|knowsAbout/);
});
