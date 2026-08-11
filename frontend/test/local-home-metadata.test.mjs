import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(
  new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url),
  "utf8"
);

test("home metadata defaults to a local-intent agency title", () => {
  assert.match(page, /Agence de voyages à \$\{city\}/);
  assert.match(page, /page\.seoTitle \|\|/);
});

test("home metadata keeps editorial SEO overrides authoritative", () => {
  assert.match(page, /page\.metaDescription \|\|/);
  assert.match(page, /page\.seoDescription \|\|/);
  assert.match(page, /localHomeDescription\(site\)/);
});

test("public OpenGraph identifies the local site consistently", () => {
  assert.match(page, /locale: "fr_FR"/);
  assert.match(page, /siteName: site\.name/);
});
