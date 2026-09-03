"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  BlueprintCoreAdapter,
} = require(
  "../src/modules/minisite-blueprint/core-adapter"
);

test(
  "crée un CTA Blueprint conforme au Core",
  () => {
    const adapter =
      new BlueprintCoreAdapter();

    const block =
      adapter.create(
        "cta"
      );

    assert.equal(
      block.type,
      "cta"
    );

    assert.equal(
      block.content
        .primaryCta
        .label,
      "Demander un devis"
    );

    assert.equal(
      block.content
        .primaryCta
        .href,
      "#contact"
    );
  }
);

test(
  "adapte un ancien CTA Blueprint",
  () => {
    const adapter =
      new BlueprintCoreAdapter();

    const result =
      adapter.adaptBlock({
        type:
          "cta",

        content: {
          title:
            "Construisons votre voyage",
        },
      });

    assert.equal(
      result.migrated,
      true
    );

    assert.equal(
      result.block
        .content
        .primaryCta
        .label,
      "Demander un devis"
    );
  }
);

test(
  "adapte une page complète",
  () => {
    const adapter =
      new BlueprintCoreAdapter();

    const result =
      adapter.adaptPage({
        slug:
          "agence",

        blocks: [
          {
            type:
              "breadcrumbs",

            content: {
              items: [
                {
                  label:
                    "Accueil",

                  href:
                    "/",
                },

                {
                  label:
                    "Agence",

                  href:
                    "/agence",
                },
              ],
            },
          },

          {
            type:
              "text",

            content: {
              title:
                "Notre agence",

              text:
                "Présentation.",
            },
          },

          {
            type:
              "cta",

            content: {
              title:
                "Parlons de votre projet",
            },
          },
        ],
      });

    assert.equal(
      result.summary.blockCount,
      3
    );

    assert.equal(
      result.page.blocks[2]
        .content
        .primaryCta
        .href,
      "#contact"
    );
  }
);

test(
  "refuse un type Blueprint inconnu",
  () => {
    const adapter =
      new BlueprintCoreAdapter();

    assert.throws(
      () =>
        adapter.adaptBlock({
          type:
            "unknown-blueprint-block",

          content:
            {},
        }),
      (error) => {
        assert.equal(
          error.code,
          "UNKNOWN_BLOCK_TYPE"
        );

        return true;
      }
    );
  }
);
