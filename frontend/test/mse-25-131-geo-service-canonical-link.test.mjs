import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const helper = fs.readFileSync(path.join(root, "lib/seo/service-page-schema.js"), "utf8");
const page = fs.readFileSync(
  path.join(root, "app/agence/[siteSlug]/[[...pageSlug]]/page.js"),
  "utf8"
);

test("MSE-25.131 OfferCatalog links back to its canonical WebPage", () => {
  assert.match(helper, /function linkServiceCatalogToPage/);
  assert.match(helper, /mainEntityOfPage:/);
  assert.match(helper, /"@type": "WebPage"/);
  assert.match(helper, /`\$\{url\}#webpage`/);
});

test("MSE-25.131 services renderer emits the linked catalog while preserving empty fallback", () => {
  assert.match(page, /const rawServiceCatalog = servicesPage \? buildServiceCatalogSchema\(site, page\) : null/);
  assert.match(page, /const serviceCatalog = linkServiceCatalogToPage\(rawServiceCatalog, currentUrl\)/);
  assert.match(helper, /if \(!serviceCatalog\?\.\["@id"\] \|\| !url\) return serviceCatalog/);
});
