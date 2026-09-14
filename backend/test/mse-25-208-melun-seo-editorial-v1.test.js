"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const scriptPath = path.join(__dirname, "..", "scripts", "mse-25-208-melun-seo-editorial-v1.js");
const source = fs.readFileSync(scriptPath, "utf8");
const mod = require(scriptPath);

test("MSE-25.208 targets only current Melun identity", () => {
  assert.equal(mod.CONTRACT, "MSE-25.208");
  assert.equal(mod.TARGET_SITE_SLUG, "tui-store-melun");
  assert.equal(mod.EXPECTED_AGENCY_ID, 8);
  assert.equal(mod.FUTURE_SLUG, "ambassade-fram-mondescale-melun");
});

test("MSE-25.208 preserves the audited Melun topology contract", () => {
  assert.equal(mod.EXPECTED_TOPOLOGY, "06072a84a232869e738107683549a3c5978418ebadcbc4aa8b7529c0dec9e100");
});

test("MSE-25.208 only patches already published audited page slugs", () => {
  assert.deepEqual(Object.keys(mod.PAGE_PATCHES).sort(), ["", "agence", "avis", "contact", "destinations", "equipe", "services"].sort());
});

test("MSE-25.208 only patches the two existing Melun editorial blocks", () => {
  assert.deepEqual(Object.keys(mod.BLOCK_PATCHES).sort(), ["mse25125bnmelunhome", "mse25125bnmelunservices"].sort());
});

test("MSE-25.208 never activates future branding in proposed content", () => {
  const proposed = JSON.stringify({ pages: mod.PAGE_PATCHES, blocks: mod.BLOCK_PATCHES }).toLowerCase();
  assert.equal(proposed.includes("ambassade fram"), false);
  assert.equal(proposed.includes("ambassade-fram-mondescale-melun"), false);
});

test("MSE-25.208 does not create pages, routes or agencies", () => {
  assert.equal(/agencySitePage\.create\s*\(/.test(source), false);
  assert.equal(/agencySite\.update\s*\(/.test(source), false);
  assert.equal(/agency\.update\s*\(/.test(source), false);
  assert.equal(/pageBlock\.create\s*\(/.test(source), false);
  assert.equal(/updateMany\s*\(/.test(source), false);
  assert.equal(/deleteMany\s*\(/.test(source), false);
});

test("MSE-25.208 stays dry-run unless explicit confirmation is present", () => {
  assert.match(source, /MSE_25_208_CONFIRM/);
  assert.match(source, /mode:\s*"DRY_RUN"/);
  assert.match(source, /mutationPerformed:\s*false/);
});

test("MSE-25.208 has explicit snapshot and rollback support", () => {
  assert.match(source, /MSE_25_208_SNAPSHOT/);
  assert.match(source, /MSE_25_208_ROLLBACK/);
  assert.match(source, /protected fingerprint changed; rollback applied/);
  assert.match(source, /route topology changed; rollback applied/);
});

test("MSE-25.208 makes Melun intent explicit in H1s", () => {
  for (const [slug, patch] of Object.entries(mod.PAGE_PATCHES)) {
    assert.match(patch.h1, /Melun/i, `H1 should mention Melun for ${slug || "HOME"}`);
  }
});
