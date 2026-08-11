import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(
  new URL("../app/agence/[siteSlug]/inspiration/page.js", import.meta.url),
  "utf8"
);

test("inspiration cards expose only real publication dates", () => {
  assert.match(page, /item\.publishedAt \|\| item\.createdAt/);
  assert.match(page, /<time dateTime=\{published\.iso\}>/);
  assert.doesNotMatch(page, /new Date\(\)\.toISOString/);
});

test("invalid dates are omitted instead of manufactured", () => {
  assert.match(page, /Number\.isNaN\(date\.getTime\(\)\)/);
  assert.match(page, /return null/);
});
