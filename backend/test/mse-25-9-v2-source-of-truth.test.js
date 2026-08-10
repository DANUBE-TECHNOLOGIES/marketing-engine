"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 Website Designer V2 persists its rich block contract in PageBlock", () => {
  const repository = read("backend/src/modules/page-builder-persistence/repository.js");
  const schema = read("backend/prisma/schema.prisma");

  assert.match(repository, /tx\.pageBlock\.deleteMany/);
  assert.match(repository, /tx\.pageBlock\.createMany/);
  assert.match(schema, /model PageBlock \{/);
  assert.match(schema, /settings\s+Json/);
  assert.match(schema, /seo\s+Json/);
  assert.match(schema, /visibleDesktop\s+Boolean/);
  assert.match(schema, /visibleMobile\s+Boolean/);
  assert.match(schema, /version\s+Int/);
});

test("MSE-25.9 legacy AgencySiteSection remains a compatibility fallback, not the V2 storage model", () => {
  const schema = read("backend/prisma/schema.prisma");
  const publicReader = read("backend/src/modules/public-site-read/section-aware-service.js");

  assert.match(schema, /model AgencySiteSection \{/);
  assert.match(schema, /jsonContent\s+Json/);
  assert.match(publicReader, /website-designer-v2-blocks/);
  assert.match(publicReader, /agency-site-sections/);
  assert.match(publicReader, /const blocks = v2Blocks\.length/);
});

test("MSE-25.9 guarded publication promotes both V2 and legacy persistence generations", () => {
  const repository = read("backend/src/modules/site-publication/repository.js");

  assert.match(repository, /tx\.pageBlock\.updateMany/);
  assert.match(repository, /tx\.agencySiteSection\.updateMany/);
  assert.match(repository, /blocksPublished/);
  assert.match(repository, /sectionsPublished/);
});

test("MSE-25.9 launch readiness evaluates V2 blocks before legacy sections", () => {
  const readiness = read("backend/src/modules/agency-launch/prepublication-readiness.js");

  assert.match(readiness, /blockState\.total > 0/);
  assert.match(readiness, /source === ["']website-designer-v2-blocks["']/);
  assert.match(readiness, /publishedBlocks/);
  assert.match(readiness, /publishedSections/);
});
