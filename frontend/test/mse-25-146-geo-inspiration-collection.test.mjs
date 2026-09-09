import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaSource = await readFile(
  new URL("../lib/seo/inspiration-collection-schema.js", import.meta.url),
  "utf8"
);
const indexSource = await readFile(
  new URL("../app/agence/[siteSlug]/inspiration/page.js", import.meta.url),
  "utf8"
);
const detailSource = await readFile(
  new URL("../app/agence/[siteSlug]/inspiration/[contentSlug]/page.js", import.meta.url),
  "utf8"
);

test("inspiration visible URL and canonical Article URL remain distinct when editorial canonical owner differs", () => {
  assert.match(schemaSource, /inspirationVisiblePath\(siteSlug, item\)/);
  assert.match(schemaSource, /item\?\.editorialCanonical\?\.siteSlug \|\| siteSlug/);
  assert.match(schemaSource, /visibleUrl/);
  assert.match(schemaSource, /canonicalUrl/);
});

test("inspiration collection reuses canonical WebPage identity and publishes one ItemList", () => {
  assert.match(schemaSource, /"@type": "CollectionPage"/);
  assert.match(schemaSource, /"@id": `\$\{pageUrl\}#webpage`/);
  assert.match(schemaSource, /"@type": "ItemList"/);
  assert.match(schemaSource, /numberOfItems: publicEntries\.length/);
});

test("ListItem keeps the visible local href while Article points to its canonical identity", () => {
  assert.match(schemaSource, /url: entry\.visibleUrl/);
  assert.match(schemaSource, /"@type": "Article"/);
  assert.match(schemaSource, /"@id": `\$\{entry\.canonicalUrl\}#article`/);
  assert.match(schemaSource, /url: entry\.canonicalUrl/);
});

test("inspiration index cards and collection use the same visible path resolver", () => {
  assert.match(indexSource, /const articlePath = inspirationVisiblePath\(siteSlug, item\)/);
  assert.match(indexSource, /buildInspirationCollectionSchemas\(\{ siteSlug, items \}\)/);
});

test("canonical inspiration detail publishes the same stable Article id referenced by the collection", () => {
  assert.match(detailSource, /"@id": data\.content\.schemaOrg\["@id"\] \|\| `\$\{canonical\}#article`/);
  assert.match(detailSource, /"@id": `\$\{canonical\}#article`/);
});

test("inspiration collection GEO does not add transactional or inferred expertise claims", () => {
  assert.doesNotMatch(schemaSource, /price|availability|stock|booking|knowsAbout/i);
});
