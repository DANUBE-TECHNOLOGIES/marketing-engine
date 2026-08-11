import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(
  new URL("../app/agence/[siteSlug]/inspiration/[contentSlug]/page.js", import.meta.url),
  "utf8"
);

test("article canonical is absolute and shared with OpenGraph", () => {
  assert.match(page, /const canonical = `\$\{PUBLIC_ORIGIN\}/);
  assert.match(page, /alternates:\s*\{[\s\S]*canonical/);
  assert.match(page, /url: canonical/);
});

test("article schema exposes real publication and modification dates when available", () => {
  assert.match(page, /datePublished/);
  assert.match(page, /dateModified/);
  assert.match(page, /publishedAt/);
  assert.match(page, /updatedAt/);
});

test("article schema links author and publisher to the canonical agency", () => {
  assert.match(page, /"@type": "Organization"/);
  assert.match(page, /"@type": "TravelAgency"/);
  assert.match(page, /#travel-agency/);
  assert.match(page, /buildBreadcrumbSchema/);
});
