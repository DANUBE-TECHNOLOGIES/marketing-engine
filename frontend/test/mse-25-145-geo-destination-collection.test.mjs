import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const collectionSource = await readFile(
  new URL("../lib/seo/destination-public-collection.js", import.meta.url),
  "utf8"
);
const schemaSource = await readFile(
  new URL("../lib/seo/destination-collection-schema.js", import.meta.url),
  "utf8"
);
const rendererSource = await readFile(
  new URL("../components/public-site/renderers/DestinationsRenderer.js", import.meta.url),
  "utf8"
);
const routeSource = await readFile(
  new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url),
  "utf8"
);

test("visible destination cards and GEO collection share one URL resolver and item extractor", () => {
  assert.match(rendererSource, /destinationHref,/);
  assert.match(rendererSource, /destinationSectionItems,/);
  assert.match(rendererSource, /const items = destinationSectionItems\(section\)/);
  assert.match(collectionSource, /const href = destinationHref\(site, item\)/);
});

test("public destination collection keeps only named public hrefs and deduplicates by URL", () => {
  assert.match(collectionSource, /if \(!name \|\| !href \|\| \/\^\(mailto:\|tel:\|#\)\/i\.test\(href\)\) continue/);
  assert.match(collectionSource, /const key = href\.toLocaleLowerCase\("fr-FR"\)/);
  assert.match(collectionSource, /if \(seen\.has\(key\)\) continue/);
  assert.match(collectionSource, /result\.slice\(0, 24\)/);
});

test("destination CollectionPage reuses the canonical WebPage identity and points to one ItemList", () => {
  assert.match(schemaSource, /"@type": "CollectionPage"/);
  assert.match(schemaSource, /"@id": `\$\{pageUrl\}#webpage`/);
  assert.match(schemaSource, /"@type": "ItemList"/);
  assert.match(schemaSource, /"@id": listId/);
  assert.match(schemaSource, /numberOfItems: items\.length/);
});

test("ItemList uses canonical destination URLs and stable TouristDestination ids", () => {
  assert.match(schemaSource, /url: absoluteUrl\(item\.href\)/);
  assert.match(schemaSource, /`\$\{absoluteUrl\(item\.href\)\}#destination`/);
  assert.match(schemaSource, /position: index \+ 1/);
});

test("collection graph is owned once by the public route while the renderer stays visual", () => {
  assert.match(collectionSource, /publicDestinationCollectionSections/);
  assert.match(routeSource, /buildDestinationCollectionSchemas/);
  assert.match(routeSource, /publicDestinationCollectionSections\(page\)/);
  assert.match(routeSource, /consolidateCollectionWebPage/);
  assert.doesNotMatch(rendererSource, /buildDestinationCollectionSchemas|<JsonLd/);
});

test("destination collection GEO does not add transactional or inferred expertise claims", () => {
  assert.doesNotMatch(collectionSource, /price|availability|stock|booking|knowsAbout/i);
  assert.doesNotMatch(schemaSource, /price|availability|stock|booking|knowsAbout/i);
});
