"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  designerContentState,
  pagePresenceCheck,
  contentCheck,
} = require("../src/modules/agency-launch/prepublication-readiness");

test("MSE-25.9 draft pages may legitimately contain draft Designer sections before publication", () => {
  const state = designerContentState({
    status: "draft",
    published: false,
    sections: [
      { status: "draft", sectionType: "hero" },
      { status: "draft", sectionType: "destinations" },
    ],
  });

  assert.equal(state.hasDesignerSections, true);
  assert.equal(state.publishedSections, 0);
  assert.equal(state.coherent, true);
});

test("MSE-25.9 published pages fail readiness when every Designer section is still draft", () => {
  const page = {
    id: "home-1",
    slug: "",
    status: "published",
    published: true,
    sections: [
      { status: "draft", sectionType: "hero" },
      { status: "draft", sectionType: "destinations" },
    ],
  };

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);

  assert.equal(check.exists, true);
  assert.equal(check.published, true);
  assert.equal(check.contentState.publishedSections, 0);
  assert.equal(check.passed, false);
});

test("MSE-25.9 published pages pass once at least one visible Designer section is public", () => {
  const page = {
    id: "home-1",
    slug: "",
    status: "published",
    published: true,
    sections: [
      { status: "published", sectionType: "hero" },
      { status: "draft", sectionType: "destinations" },
      { status: "hidden", sectionType: "team" },
    ],
  };

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);

  assert.equal(check.contentState.totalSections, 3);
  assert.equal(check.contentState.visibleSections, 2);
  assert.equal(check.contentState.publishedSections, 1);
  assert.equal(check.passed, true);
});

test("MSE-25.9 legacy published pages remain compatible when they have no Designer sections", () => {
  const page = {
    id: "legacy-home",
    slug: "home",
    status: "published",
    published: true,
  };

  const check = pagePresenceCheck([page], { key: "home", label: "Accueil" }, true);

  assert.equal(check.contentState.hasDesignerSections, false);
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
        sections: [{ status: "draft", sectionType: "hero" }],
      },
      { id: "agency", slug: "agence", status: "draft", sections: [] },
      { id: "services", slug: "services", status: "draft", sections: [] },
      { id: "contact", slug: "contact", status: "draft", sections: [] },
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
