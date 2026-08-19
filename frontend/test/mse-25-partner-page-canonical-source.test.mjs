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
