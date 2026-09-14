import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const semantics = read("lib/seo/page-semantics-schema.js");
const route = read("app/agence/[siteSlug]/[[...pageSlug]]/page.js");
const services = read("lib/seo/service-page-schema.js");

test("MSE-25.161 semantic enrichment is merged into the canonical WebPage node", () => {
  assert.match(semantics, /mergePageSemanticsIntoWebPage/);
  assert.match(semantics, /webPage\["@id"\] !== semantics\["@id"\]/);
  assert.match(semantics, /datePublished: semantics\.datePublished/);
  assert.match(semantics, /dateModified: semantics\.dateModified/);
  assert.match(semantics, /normalizedTypes/);
});

test("MSE-25.161 generic route emits one canonical WebPage schema instead of a semantic duplicate", () => {
  assert.match(route, /mergePageSemanticsIntoWebPage\(faqAwareWebPageSchema, pageSemanticsSchema\)/);
  assert.match(route, /<JsonLd data=\{webPageSchema\} \/>/);
  assert.doesNotMatch(route, /<JsonLd data=\{pageSemanticsSchema\}/);
});

test("MSE-25.161 preserves existing page authority such as the Services OfferCatalog mainEntity", () => {
  assert.match(services, /mainEntity: catalog/);
  assert.match(route, /buildServiceAwareWebPageSchema/);
  assert.match(route, /linkFaqToWebPage\(baseWebPageSchema, faqSchema\)/);
  assert.doesNotMatch(semantics, /mainEntity\s*:/);
});

test("MSE-25.161 does not create commercial or expertise facts", () => {
  const combined = `${semantics}\n${route}`;
  assert.doesNotMatch(combined, /aggregateRating|price|availability|stock|booking|knowsAbout/);
});
