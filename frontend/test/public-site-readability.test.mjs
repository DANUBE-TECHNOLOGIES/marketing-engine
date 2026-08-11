import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(
  new URL("../components/public-site/public-readability-fixes.css", import.meta.url),
  "utf8"
);

const layout = await readFile(
  new URL("../app/agence/[siteSlug]/layout.js", import.meta.url),
  "utf8"
);

test("stats section keeps explicit high contrast", () => {
  assert.match(css, /\.public-site-stats\s*\{/);
  assert.match(css, /color:\s*#ffffff\s*!important/);
  assert.match(css, /#071d30/);
  assert.match(css, /\.public-site-stats-grid article/);
});

test("navigation links cannot be clipped at the right edge", () => {
  assert.match(css, /scroll-padding-inline:\s*20px/);
  assert.match(css, /padding-right:\s*34px/);
  assert.match(css, /text-overflow:\s*clip/);
  assert.match(css, /white-space:\s*nowrap/);
  assert.match(css, /flex:\s*0 0 auto/);
});

test("readability overrides load after premium styles", () => {
  const premium = layout.indexOf('premium-public.css');
  const readability = layout.indexOf('public-readability-fixes.css');

  assert.ok(premium >= 0);
  assert.ok(readability > premium);
});
