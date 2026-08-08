"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validatePagePayload,
} = require(
  "../src/modules/page-builder-persistence/validation"
);

const PageBuilderPersistenceService =
  require(
    "../src/modules/page-builder-persistence/service"
  );

test(
  "valide une page et ses blocs",
  () => {
    const input = validatePagePayload({
      page: {
        title: "Voyage à Budapest",
        slug: "budapest",
        status: "draft",
        seoTitle:
          "Voyage à Budapest depuis Ozoir",
        seoDescription:
          "Découvrez Budapest avec votre agence de voyages.",
      },

      blocks: [
        {
          type: "hero",
          status: "draft",
          content: {
            title: "Budapest",
          },
        },

        {
          type: "cta",
          status: "published",
          content: {
            title: "Préparons votre voyage",
            text: "",
            primaryCta: {
              label: "Demander un devis",
              href: "#contact",
            },
            secondaryCta: null,
            style: "primary",
          },
        },
      ],
    });

    assert.equal(
      input.page.slug,
      "budapest"
    );

    assert.equal(
      input.blocks.length,
      2
    );

    assert.equal(
      input.blocks[0].type,
      "hero"
    );
  }
);

test(
  "refuse deux blocs hero",
  () => {
    assert.throws(
      () =>
        validatePagePayload({
          page: {
            title: "Accueil",
            slug: "",
            status: "draft",
          },

          blocks: [
            {
              type: "hero",
              content: {
                title: "Premier",
              },
            },
            {
              type: "hero",
              content: {
                title: "Second",
              },
            },
          ],
        }),
      {
        code:
          "DUPLICATE_SINGLETON_BLOCK",
      }
    );
  }
);

test(
  "le health expose versions et rollback",
  () => {
    const service =
      new PageBuilderPersistenceService(
        {},
        "tenant-test"
      );

    const health = service.health();

    assert.equal(
      health.persistence,
      "PageBlock"
    );

    assert.equal(
      health.rollback,
      true
    );
  }
);
