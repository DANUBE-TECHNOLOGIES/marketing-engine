"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  validateAndMigratePagePayload,
} = require(
  "../src/modules/page-builder-persistence/core-payload-adapter"
);

test(
  "accepte et migre un ancien CTA",
  () => {
    const result =
      validateAndMigratePagePayload({
        page: {
          title:
            "Accueil",
        },

        blocks: [
          {
            id:
              "cta-1",

            type:
              "cta",

            status:
              "published",

            position:
              0,

            content: {
              title:
                "Contactez-nous",
            },

            settings:
              {},

            seo:
              {},

            visibleDesktop:
              true,

            visibleMobile:
              true,
          },
        ],
      });

    assert.equal(
      result.summary.blockCount,
      1
    );

    assert.equal(
      result.summary.validCount,
      1
    );

    assert.equal(
      result.summary.migratedCount,
      1
    );

    assert.equal(
      result.payload
        .blocks[0]
        .content
        .primaryCta
        .label,
      "Demander un devis"
    );

    assert.equal(
      result.payload
        .blocks[0]
        .content
        .primaryCta
        .href,
      "#contact"
    );
  }
);

test(
  "conserve l’identifiant et la position",
  () => {
    const result =
      validateAndMigratePagePayload({
        blocks: [
          {
            id:
              "text-1",

            type:
              "text",

            status:
              "published",

            position:
              4,

            content: {
              title:
                "Titre",

              text:
                "Contenu",
            },
          },
        ],
      });

    assert.equal(
      result.payload
        .blocks[0]
        .id,
      "text-1"
    );

    assert.equal(
      result.payload
        .blocks[0]
        .position,
      4
    );
  }
);

test(
  "refuse encore un type inconnu",
  () => {
    assert.throws(
      () =>
        validateAndMigratePagePayload({
          blocks: [
            {
              type:
                "unknown-block",

              content:
                {},
            },
          ],
        }),
      (error) => {
        assert.equal(
          error.statusCode,
          400
        );

        assert.equal(
          error.code,
          "UNKNOWN_BLOCK_TYPE"
        );

        return true;
      }
    );
  }
);
