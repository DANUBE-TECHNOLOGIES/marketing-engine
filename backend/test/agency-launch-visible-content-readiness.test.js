"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  designerContentState,
  pagePresenceCheck,
} = require("../src/modules/agency-launch/prepublication-readiness");

test("required draft page with a visible draft block is launch-ready", () => {
  const page = {
    id: "page-home",
    slug: "",
    status: "draft",
    published: false,
    blocks: [
      { id: "block-1", status: "draft" },
    ],
    sections: [],
  };

  const state = designerContentState(page);
  assert.equal(state.hasVisibleContent, true);
  assert.equal(state.coherent, true);

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);
  assert.equal(check.passed, true);
});

test("required page containing only hidden blocks is not launch-ready", () => {
  const page = {
    id: "page-home",
    slug: "",
    status: "draft",
    published: false,
    blocks: [
      { id: "block-1", status: "hidden" },
    ],
    sections: [],
  };

  const state = designerContentState(page);
  assert.equal(state.hasVisibleContent, false);
  assert.equal(state.coherent, false);

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);
  assert.equal(check.passed, false);
});

test("published page must contain at least one published visible entry", () => {
  const page = {
    id: "page-home",
    slug: "",
    status: "published",
    published: true,
    blocks: [
      { id: "block-1", status: "draft" },
    ],
    sections: [],
  };

  const state = designerContentState(page);
  assert.equal(state.hasVisibleContent, true);
  assert.equal(state.publishedBlocks, 0);
  assert.equal(state.coherent, false);
});

test("empty required page is never launch-ready", () => {
  const page = {
    id: "page-home",
    slug: "",
    status: "draft",
    published: false,
    blocks: [],
    sections: [],
  };

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);
  assert.equal(check.passed, false);
  assert.equal(check.contentState.source, "empty");
});
