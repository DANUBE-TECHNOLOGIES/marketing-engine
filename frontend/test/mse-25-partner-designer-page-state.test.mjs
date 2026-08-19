import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("designer loads generated partner sections when legacy blocks array is empty", () => {
  const state = read("lib/page-builder-v2/page-builder-state.js");

  assert.match(state, /function canonicalPageBlocks\(page\)/);
  assert.match(state, /Array\.isArray\(page\?\.sections\) && page\.sections\.length/);
  assert.match(state, /Array\.isArray\(page\?\.blocks\) && page\.blocks\.length/);
  assert.ok(
    state.indexOf("Array.isArray(page?.sections) && page.sections.length") <
      state.indexOf("Array.isArray(page?.blocks) && page.blocks.length"),
    "canonical AgencySiteSection content must win over legacy PageBlock content"
  );
  assert.match(state, /const blocks = canonicalPageBlocks\(page\)/);
  assert.match(state, /page\?\.metaDescription/);
});

test("designer save wiring reaches the agency-site transactional blocks endpoint", () => {
  const api = read("lib/page-builder-v2/page-builder-api.js");
  const proxy = read("app/api/website-builder/agencies/[agencyId]/pages/[pageSlug]/route.js");

  assert.match(api, /export async function savePage/);
  assert.match(api, /serialized=serializePage\(page\)/);
  assert.match(api, /status:serialized\.status/);
  assert.match(api, /published:serialized\.published/);
  assert.match(proxy, /request\.method === "PUT"/);
  assert.match(proxy, /\? "\/blocks"/);
});

test("draft review and archived statuses serialize as non-public", () => {
  const state = read("lib/page-builder-v2/page-builder-state.js");

  assert.match(state, /page\.status === "published"\s*\? true/);
  assert.match(state, /page\.status === "draft" \|\|/);
  assert.match(state, /page\.status === "review" \|\|/);
  assert.match(state, /page\.status === "archived"/);
});
