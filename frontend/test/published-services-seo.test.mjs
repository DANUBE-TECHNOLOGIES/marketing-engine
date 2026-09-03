import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(
  new URL("../lib/seo/json-ld.js", import.meta.url),
  "utf8"
);
const page = await readFile(
  new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url),
  "utf8"
);

test("service expertise is extracted only from public content entries", () => {
  assert.match(schema, /extractPublishedServices/);
  assert.match(schema, /status === "hidden" \|\| status === "draft"/);
  assert.match(schema, /content\.services \|\|/);
  assert.match(schema, /content\.items \|\|/);
});

test("services page emits an OfferCatalog of real published services", () => {
  assert.match(schema, /"@type": "OfferCatalog"/);
  assert.match(schema, /"@type": "Service"/);
  assert.match(schema, /#travel-agency/);
});

test("services metadata uses local intent and published expertise as fallback", () => {
  assert.match(page, /Services de voyage à \$\{city\}/);
  assert.match(page, /extractPublishedServices\(page\)/);
  assert.match(page, /page\.seoTitle \|\|/);
  assert.match(page, /page\.metaDescription \|\|/);
});
