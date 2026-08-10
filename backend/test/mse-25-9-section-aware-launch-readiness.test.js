"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  designerContentState,
  pagePresenceCheck,
  contentCheck,
} = require("../src/modules/agency-launch/prepublication-readiness");

test("MSE-25.9 draft pages may legitimately contain draft V2 blocks before publication", () => {
  const state = designerContentState({
    status: "draft",
    published: false,
    blocks: [
      { status: "draft", blockType: "hero" },
      { status: "draft", blockType: "destinations" },
    ],
    sections: [
      { status: "published", sectionType: "hero" },
    ],
  });

  assert.equal(state.source, "website-designer-v2-blocks");
  assert.equal(state.hasV2Blocks, true);
  assert.equal(state.publishedBlocks, 0);
  assert.equal(state.coherent, true);
});

test("MSE-25.9 published pages fail readiness when every V2 block is still draft", () => {
  const page = {
    id: "home-1",
    slug: "",
    status: "published",
    published: true,
    blocks: [
      { status: "draft", blockType: "hero" },
      { status: "draft", blockType: "destinations" },
    ],
    sections: [
      { status: "published", sectionType: "hero" },
    ],
  };

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);

  assert.equal(check.exists, true);
  assert.equal(check.published, true);
  assert.equal(check.contentState.source, "website-designer-v2-blocks");
  assert.equal(check.contentState.publishedBlocks, 0);
  assert.equal(check.passed, false);
});

test("MSE-25.9 published pages pass once at least one visible V2 block is public", () => {
  const page = {
    id: "home-1",
    slug: "",
    status: "published",
    published: true,
    blocks: [
      { status: "published", blockType: "hero" },
      { status: "draft", blockType: "destinations" },
      { status: "hidden", blockType: "team" },
    ],
    sections: [
      { status: "draft", sectionType: "hero" },
    ],
  };

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);

  assert.equal(check.contentState.totalBlocks, 3);
  assert.equal(check.contentState.visibleBlocks, 2);
  assert.equal(check.contentState.publishedBlocks, 1);
  assert.equal(check.passed, true);
});

test("MSE-25.9 legacy sections remain the readiness source before a V2 save", () => {
  const page = {
    id: "legacy-home",
    slug: "home",
    status: "published",
    published: true,
    blocks: [],
    sections: [
      { status: "published", sectionType: "hero" },
    ],
  };

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);

  assert.equal(check.contentState.source, "agency-site-sections");
  assert.equal(check.contentState.publishedSections, 1);
  assert.equal(check.passed, true);
});

test("MSE-25.9 empty legacy published pages remain compatible during transition", () => {
  const page = {
    id: "empty-legacy-home",
    slug: "home",
    status: "published",
    published: true,
  };

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);

  assert.equal(check.contentState.source, "empty");
  assert.equal(check.passed, true);
});

test("MSE-25.9 GENERAL_CONTENT blocks an inconsistent published required page", () => {
  const site = {
    pages: [
      {
        id: "home",
        slug: "",
        status: "published",
        published: true,
        blocks: [{ status: "draft", blockType: "hero" }],
        sections: [{ status: "published", sectionType: "hero" }],
      },
      { id: "agency", slug: "agence", status: "draft", blocks: [], sections: [] },
      { id: "services", slug: "services", status: "draft", blocks: [], sections: [] },
      { id: "contact", slug: "contact", status: "draft", blocks: [], sections: [] },
    ],
  };

  const check = contentCheck(site);

  assert.equal(check.passed, false);
  assert.equal(check.requiredPassed, 3);
  assert.equal(
    check.requiredPages.find((item) => item.slug === "home").passed,
    false
  );
});
