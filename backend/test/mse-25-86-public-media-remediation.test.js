"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("brand logo reserves geometry and does not compete with hero by default", () => {
  const source = read("frontend/components/public-site/PublicBrandLogo.js");
  assert.match(source, /DEFAULT_LOGO_WIDTH\s*=\s*240/);
  assert.match(source, /DEFAULT_LOGO_HEIGHT\s*=\s*96/);
  assert.match(source, /priority\s*=\s*false/);
  assert.match(source, /width=\{logo\.width \|\| DEFAULT_LOGO_WIDTH\}/);
  assert.match(source, /height=\{logo\.height \|\| DEFAULT_LOGO_HEIGHT\}/);
});

test("compact and directory partner logos reserve intrinsic geometry", () => {
  const compact = read("frontend/components/public-site/renderers/PartnersRenderer.js");
  const directory = read("frontend/components/public-site/renderers/PartnerDirectoryRenderer.js");
  assert.match(compact, /PARTNER_LOGO_WIDTH\s*=\s*180/);
  assert.match(compact, /PARTNER_LOGO_HEIGHT\s*=\s*90/);
  assert.match(directory, /DIRECTORY_LOGO_WIDTH\s*=\s*180/);
  assert.match(directory, /DIRECTORY_LOGO_HEIGHT\s*=\s*90/);
  assert.ok((directory.match(/width=\{DIRECTORY_LOGO_WIDTH\}/g) || []).length >= 2);
});

test("secondary pages cannot render multiple partner directory sources", () => {
  const source = read("frontend/components/public-site/PublicSiteSections.js");
  assert.match(source, /PARTNER_DIRECTORY_RENDER_TYPES/);
  assert.match(source, /dedupeSecondaryPartnerDirectories/);
  assert.match(source, /if \(seenDirectory\) return false/);
  assert.match(source, /dedupeSecondaryPartnerDirectories\(page, compactSecondarySections\(page, visible\)\)/);
});
