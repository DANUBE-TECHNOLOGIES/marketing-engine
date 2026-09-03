"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  publishedLike,
  publicBlocks,
  normalizePage,
} = require("../src/modules/public-site-read/service");

test("publishedLike rejects draft and hidden records", () => {
  assert.equal(publishedLike({ status: "draft" }), false);
  assert.equal(publishedLike({ status: "hidden" }), false);
  assert.equal(publishedLike({ status: "published" }), true);
});

test("publicBlocks exposes only blocks explicitly published", () => {
  const blocks = publicBlocks([
    { id: "hero", blockType: "hero", status: "published", content: { title: "Voyages" } },
    { id: "draft", blockType: "text", status: "draft", content: { text: "Brouillon" } },
    { id: "hidden", blockType: "text", status: "hidden", content: { text: "Interne" } },
  ]);

  assert.deepEqual(blocks.map((block) => block.id), ["hero"]);
});

test("normalizePage never leaks draft or hidden designer blocks", () => {
  const page = normalizePage({
    id: "page-1",
    slug: "home",
    status: "published",
    published: true,
    blocks: [
      { id: "public", blockType: "hero", status: "published" },
      { id: "work-in-progress", blockType: "text", status: "draft" },
      { id: "disabled", blockType: "faq", status: "hidden" },
    ],
  });

  assert.equal(page.published, true);
  assert.deepEqual(page.blocks.map((block) => block.id), ["public"]);
});
