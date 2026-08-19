"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { publicPagePayload } = require("../src/modules/agency-site/routes");

test("public partner page keeps canonical sections when legacy blocks also exist", () => {
  const sections = [
    { id: "section-header", sectionType: "page-header", jsonContent: { title: "Nos partenaires de voyage à Gien" } },
    { id: "section-directory", sectionType: "partner-directory", jsonContent: { title: "Tous nos partenaires voyage" } },
  ];
  const blocks = [
    { id: "legacy-block", blockType: "rich_text", content: { html: "Ancien contenu" } },
  ];

  const result = publicPagePayload({ slug: "partenaires", sections, blocks });
  assert.equal(result.sections, sections);
  assert.notEqual(result.sections, blocks);
});

test("public page falls back to legacy blocks only when canonical sections are absent", () => {
  const blocks = [
    { id: "legacy-block", blockType: "partner-directory", content: { title: "Partenaires" } },
  ];

  const result = publicPagePayload({ slug: "partenaires", sections: [], blocks });
  assert.deepEqual(result.sections, blocks);
});
