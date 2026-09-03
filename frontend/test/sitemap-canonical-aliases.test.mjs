import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sitemap = await readFile(
  new URL("../app/sitemap.js", import.meta.url),
  "utf8"
);

test("sitemap folds public page aliases into canonical URLs", () => {
  assert.match(sitemap, /home\|accueil\|index/);
  assert.match(sitemap, /inspirations/);
  assert.match(sitemap, /\$1\/inspiration/);
  assert.match(sitemap, /unique\.get/);
});
