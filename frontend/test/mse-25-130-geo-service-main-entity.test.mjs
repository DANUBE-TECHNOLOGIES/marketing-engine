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

test("MSE-25.130 services page promotes the published OfferCatalog to mainEntity", () => {
  assert.match(helper, /"@type": "OfferCatalog"/);
  assert.match(helper, /mainEntity: catalog/);
  assert.match(helper, /about: \[webPage\.about, catalog\]/);
  assert.match(helper, /buildLocalWebPageSchema/);
});

test("MSE-25.130 generic pages keep the canonical agency main entity when no catalog exists", () => {
  assert.match(helper, /if \(!catalog\) return webPage/);
});

test("MSE-25.130 public services renderer wires the real published catalog into the webpage schema", () => {
  assert.match(page, /const serviceCatalog = servicesPage \? buildServiceCatalogSchema\(site, page\) : null/);
  assert.match(page, /buildServiceAwareWebPageSchema/);
  assert.match(page, /serviceCatalog,/);
  assert.match(page, /\{serviceCatalog \? <JsonLd data=\{serviceCatalog\} \/> : null\}/);
});
