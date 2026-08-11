import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const layoutPath = new URL("../app/agence/[siteSlug]/layout.js", import.meta.url);
const siteUrlPath = new URL("../lib/seo/site-url.js", import.meta.url);

test("public agency layout only injects the global WebSite schema", async () => {
  const source = await readFile(layoutPath, "utf8");
  assert.match(source, /buildWebSiteSchema/);
  assert.doesNotMatch(source, /MiniSiteStructuredData/);
});

test("json-ld absolute URLs prefer the same public origin as canonicals", async () => {
  const source = await readFile(siteUrlPath, "utf8");
  assert.match(source, /NEXT_PUBLIC_SITE_ORIGIN/);
  assert.match(source, /PUBLIC_SITE_ORIGIN/);
  assert.match(source, /https:\/\/agences\.mondescale\.com/);
  assert.doesNotMatch(source, /localengine\.mondescale\.com/);
});
