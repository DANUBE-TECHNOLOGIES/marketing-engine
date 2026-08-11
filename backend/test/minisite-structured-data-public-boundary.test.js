"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isPublishedBlock,
  publicStructuredDataSite,
} = require("../src/modules/minisite-structured-data/service");

test("public structured-data keeps only published pages and published blocks", () => {
  const site = publicStructuredDataSite({
    id: "site-1",
    slug: "gien",
    status: "published",
    pages: [
      {
        id: "page-live",
        slug: "services",
        status: "published",
        published: true,
        blocks: [
          { id: "block-live", status: "published" },
          { id: "block-draft", status: "draft" },
          { id: "block-hidden", status: "hidden" },
        ],
      },
      {
        id: "page-draft",
        slug: "future-page",
        status: "draft",
        published: false,
        blocks: [{ id: "future-faq", status: "published" }],
      },
    ],
  });

  assert.equal(site.pages.length, 1);
  assert.equal(site.pages[0].id, "page-live");
  assert.deepEqual(site.pages[0].blocks.map((block) => block.id), ["block-live"]);
});

test("draft site has no public structured-data graph", () => {
  assert.equal(
    publicStructuredDataSite({ id: "site-1", slug: "gien", status: "draft", pages: [] }),
    null
  );
});

test("published block predicate is strict", () => {
  assert.equal(isPublishedBlock({ status: "published" }), true);
  assert.equal(isPublishedBlock({ published: true }), true);
  assert.equal(isPublishedBlock({ status: "draft" }), false);
  assert.equal(isPublishedBlock({ status: "hidden" }), false);
});
