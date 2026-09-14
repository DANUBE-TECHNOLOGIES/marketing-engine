"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const blockUtils = fs.readFileSync(
  path.join(root, "frontend/components/page-builder/shared/blockUtils.js"),
  "utf8"
);
const header = fs.readFileSync(
  path.join(root, "frontend/components/public-site/PublicSiteHeader.js"),
  "utf8"
);

test("MSE-25.201 public renderer hides explicitly disabled V2 blocks", () => {
  assert.match(blockUtils, /visibleDesktop === false && section\?\.visibleMobile === false/);
  assert.match(blockUtils, /status === "hidden"/);
  assert.doesNotMatch(blockUtils, /status === "draft"\) return false/);
});

test("MSE-25.201 keeps legacy blocks visible when viewport flags are absent", () => {
  assert.match(blockUtils, /Missing flags[\s\S]*remain visible/);
  assert.match(blockUtils, /return true;/);
});

test("MSE-25.201 agency and team navigation use document requests", () => {
  for (const slug of ["agence", "equipe", "team", "notre-equipe", "notre_equipe"]) {
    assert.ok(header.includes(`\"${slug}\"`));
  }
  assert.match(header, /requiresDocumentNavigation\(page\)/);
  assert.match(header, /data-document-navigation="true"/);
  assert.match(header, /<a key=\{key\} href=\{href\}/);
});

test("MSE-25.201 leaves normal public navigation on Next Link", () => {
  assert.match(header, /<Link key=\{key\} href=\{href\}>/);
});
