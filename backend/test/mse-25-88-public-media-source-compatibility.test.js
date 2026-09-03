"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.88 destination renderer accepts travel-core media field variants", () => {
  const file = source("frontend/components/public-site/renderers/DestinationsRenderer.js");
  for (const token of [
    "item.heroImageUrl",
    "item.coverImageUrl",
    "item.thumbnailUrl",
    "item.photoUrl",
    "item.media?.url",
    "item.image?.url",
  ]) {
    assert.ok(file.includes(token), `missing destination media source ${token}`);
  }
  assert.ok(file.includes('loading="lazy"'));
  assert.ok(file.includes('fetchPriority="low"'));
  assert.ok(file.includes('width="960" height="640"'));
});

test("MSE-25.88 team renderer accepts portrait/avatar/media field variants", () => {
  const file = source("frontend/components/public-site/renderers/TeamRenderer.js");
  for (const token of [
    "member.avatarUrl",
    "member.portraitUrl",
    "member.photoUrl",
    "member.media?.url",
    "member.image?.url",
  ]) {
    assert.ok(file.includes(token), `missing team portrait source ${token}`);
  }
  assert.ok(file.includes("function memberImage(member)"));
  assert.ok(file.includes('loading="lazy"'));
  assert.ok(file.includes('fetchPriority="low"'));
  assert.ok(file.includes('width="720" height="720"'));
});
