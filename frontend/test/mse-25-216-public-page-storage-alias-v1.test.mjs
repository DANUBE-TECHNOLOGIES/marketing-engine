import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../lib/public-site-api.js", import.meta.url),
  "utf8"
);

test("canonical inspiration public slug resolves the stored inspirations page", () => {
  assert.match(source, /PUBLIC_PAGE_STORAGE_ALIASES/);
  assert.match(source, /inspiration:\s*["']inspirations["']/);
  assert.match(source, /resolveStoredPageSlug/);
});

test("page lookup uses the storage alias before contract matching and fallback", () => {
  assert.match(source, /const storedSlug = resolveStoredPageSlug\(pageSlug\)/);
  assert.match(source, /normalizePageSlug\(candidate\?\.slug\) === storedSlug/);
  assert.match(source, /loadPublicRenderContract\(siteSlug, resolveStoredPageSlug\(pageSlug\)\)/);
});

test("home and unrelated slugs remain identity-mapped", () => {
  assert.match(source, /return PUBLIC_PAGE_STORAGE_ALIASES\[normalized\] \|\| normalized/);
});
