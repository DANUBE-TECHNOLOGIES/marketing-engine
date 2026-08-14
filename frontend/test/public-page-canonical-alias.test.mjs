import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(
  new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url),
  "utf8"
);

test("plural inspirations route redirects to the canonical editorial index", () => {
  assert.match(page, /inspirations:\s*"inspiration"/);
  assert.match(page, /permanentRedirect/);
  assert.match(page, /canonicalPageSlug/);
  assert.match(page, /isAliasPage/);
});

test("alias metadata is noindex and points to the canonical URL", () => {
  assert.match(page, /if \(isAliasPage\(pageSlug\)\)/);
  assert.match(page, /index:\s*false/);
  assert.match(page, /canonicalUrl/);
});
