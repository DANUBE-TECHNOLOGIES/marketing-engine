"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  adaptBlockForPersistence,
  validateAndMigratePagePayload,
} = require("../src/modules/page-builder-persistence/core-payload-adapter");

test("core adapter preserves V2 envelope metadata omitted by core validation", () => {
  const original = {
    id: "block-1",
    type: "rich_text",
    status: "published",
    position: 4,
    content: {
      title: "Une relation de conseil suivie à Gien",
      html: "<p>Texte local différencié.</p>",
      alignment: "left",
    },
    settings: { spacing: "normal" },
    seo: {
      generatedBy: "mse-25.30",
      purpose: "local-agency-differentiation",
    },
    visibleDesktop: false,
    visibleMobile: true,
    version: 7,
  };

  const validated = {
    id: "block-1",
    type: "rich_text",
    status: "published",
    position: 4,
    content: original.content,
    settings: original.settings,
  };

  const result = adaptBlockForPersistence(original, validated, 0);

  assert.deepEqual(result.seo, original.seo);
  assert.equal(result.visibleDesktop, false);
  assert.equal(result.visibleMobile, true);
  assert.equal(result.version, 7);
});

test("real core validation keeps MSE-25.30 differentiation marker in migrated payload", () => {
  const payload = {
    page: {
      title: "Services",
      slug: "services",
      status: "published",
      seoTitle: "Services de voyage à Gien",
      metaDescription: "Services de voyage à Gien.",
      published: true,
    },
    blocks: [
      {
        type: "rich_text",
        status: "published",
        position: 0,
        content: {
          title: "Un accompagnement organisé depuis Gien",
          html: "<p>À Gien, l’accompagnement commence par l’analyse du projet.</p>",
          alignment: "left",
        },
        settings: {},
        seo: {
          generatedBy: "mse-25.30",
          purpose: "local-agency-differentiation",
        },
        visibleDesktop: true,
        visibleMobile: false,
      },
    ],
  };

  const result = validateAndMigratePagePayload(payload);
  const block = result.payload.blocks[0];

  assert.deepEqual(block.seo, payload.blocks[0].seo);
  assert.equal(block.visibleDesktop, true);
  assert.equal(block.visibleMobile, false);
});
