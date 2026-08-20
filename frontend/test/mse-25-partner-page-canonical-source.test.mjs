import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("designer prefers AgencySiteSection content before legacy PageBlock content", () => {
  const state = read("lib/page-builder-v2/page-builder-state.js");

  const sectionsIndex = state.indexOf("Array.isArray(page?.sections) && page.sections.length");
  const blocksIndex = state.indexOf("Array.isArray(page?.blocks) && page.blocks.length");

  assert.ok(sectionsIndex >= 0, "canonical sections preference is missing");
  assert.ok(blocksIndex >= 0, "legacy blocks fallback is missing");
  assert.ok(sectionsIndex < blocksIndex, "sections must be checked before legacy blocks");
  assert.match(state, /seoDescription:\s*String\(page\?\.seoDescription \|\| page\?\.metaDescription/);
});

test("public site API prefers AgencySiteSection content before legacy PageBlock content", () => {
  const api = read("lib/public-site-api.js");

  const sectionsDeclaration = api.indexOf("const sections = Array.isArray(page.sections) ? page.sections : []");
  const blocksDeclaration = api.indexOf("const blocks = Array.isArray(page.blocks) ? page.blocks : []");
  const sectionsBranch = api.indexOf("if (sections.length)");
  const blocksBranch = api.indexOf("if (blocks.length)");

  assert.ok(sectionsDeclaration >= 0, "public API canonical sections declaration is missing");
  assert.ok(blocksDeclaration >= 0, "public API legacy blocks declaration is missing");
  assert.ok(sectionsBranch >= 0, "public API canonical sections branch is missing");
  assert.ok(blocksBranch >= 0, "public API legacy blocks fallback is missing");
  assert.ok(sectionsBranch < blocksBranch, "public API must prefer sections before legacy blocks");
  assert.match(api, /contentBlocks:\s*sections/);
  assert.match(api, /contentBlocks:\s*blocks/);
});

test("public proxy overlays canonical Agency Site page over legacy public-site-read page", () => {
  const route = read("app/api/public-sites/[[...path]]/route.js");

  assert.match(route, /\/public\/agency-sites\/\$\{encodeURIComponent\(siteSlug\)\}\/pages\/\$\{encodeURIComponent\(canonicalPageSlug\)\}/);
  assert.match(route, /canonicalPagePayload/);
  assert.match(route, /normalizeCanonicalPage/);
  assert.match(route, /const selectedPage = canonicalMatchesRequest \? canonicalPage : legacySelectedPage/);
  assert.match(route, /"x-public-site-canonical-page"/);
  assert.match(route, /version: "1\.3"/);
});
