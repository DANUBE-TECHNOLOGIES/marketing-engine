import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const apiSource = fs.readFileSync(
  new URL("../lib/public-site-api.js", import.meta.url),
  "utf8"
);

const inspirationSource = fs.readFileSync(
  new URL("../app/agence/[siteSlug]/inspiration/page.js", import.meta.url),
  "utf8"
);

test("canonical inspiration public slug resolves the stored inspirations page", () => {
  assert.match(apiSource, /PUBLIC_PAGE_STORAGE_ALIASES/);
  assert.match(apiSource, /inspiration:\s*["']inspirations["']/);
  assert.match(apiSource, /resolveStoredPageSlug/);
});

test("page lookup uses the storage alias before contract matching and fallback", () => {
  assert.match(apiSource, /const storedSlug = resolveStoredPageSlug\(pageSlug\)/);
  assert.match(apiSource, /normalizePageSlug\(candidate\?\.slug\) === storedSlug/);
  assert.match(apiSource, /loadPublicRenderContract\(siteSlug, resolveStoredPageSlug\(pageSlug\)\)/);
});

test("home and unrelated slugs remain identity-mapped", () => {
  assert.match(apiSource, /return PUBLIC_PAGE_STORAGE_ALIASES\[normalized\] \|\| normalized/);
});

test("dedicated inspiration route requests the canonical public slug", () => {
  const calls = inspirationSource.match(/publicSiteApi\.getPage\(siteSlug,\s*["']inspiration["']\)/g) || [];
  assert.ok(calls.length >= 2, "metadata and page render must both load canonical inspiration");
  assert.doesNotMatch(inspirationSource, /publicSiteApi\.getPage\(siteSlug,\s*["']inspirations["']\)/);
});

test("dedicated inspiration route renders the CMS page h1 when present", () => {
  assert.match(inspirationSource, /function inspirationPageHeading\(/);
  assert.match(inspirationSource, /const pageH1 = String\(page\?\.h1 \|\| ["']{2}\)/);
  assert.match(inspirationSource, /if \(pageH1\) return pageH1/);
  assert.match(inspirationSource, /<h1>\{heading\}<\/h1>/);
});
