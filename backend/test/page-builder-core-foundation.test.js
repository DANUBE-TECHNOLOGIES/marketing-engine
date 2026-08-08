"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  CoreBlockRegistry,
  BlockFactory,
  BlockValidator,
  migrateBlock,
  serializeBlock,
} = require(
  "../src/modules/page-builder/core"
);

test(
  "le registre Core charge le catalogue existant",
  () => {
    const registry =
      new CoreBlockRegistry();

    assert.equal(
      registry.has(
        "hero"
      ),
      true
    );

    assert.equal(
      registry.has(
        "cta"
      ),
      true
    );

    assert.equal(
      registry.has(
        "destination-grid"
      ),
      true
    );

    assert.equal(
      registry.has(
        "breadcrumbs"
      ),
      true
    );
  }
);

test(
  "la Factory crée un CTA conforme",
  () => {
    const factory =
      new BlockFactory();

    const block =
      factory.create(
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
  "le migrateur complète un ancien CTA",
  () => {
    const result =
      migrateBlock({
        type:
          "cta",

        status:
          "published",

        position:
          2,

        content: {
          title:
            "Contactez-nous",
        },
      });

    assert.equal(
      result.migrated,
      true
    );

    assert.deepEqual(
      result.migrations,
      [
        "cta:add-primary-cta",
      ]
    );

    assert.equal(
      result.block.content
        .primaryCta.label,
      "Demander un devis"
    );

    assert.equal(
      result.block.content
        .primaryCta.href,
      "#contact"
    );
  }
);

test(
  "le validateur accepte un ancien CTA après migration",
  () => {
    const validator =
      new BlockValidator();

    const result =
      validator.validate({
        type:
          "cta",

        status:
          "published",

        position:
          0,

        content: {
          title:
            "Préparons votre voyage",
        },

        settings:
          {},

        seo:
          {},

        visibleDesktop:
          true,

        visibleMobile:
          true,
      });

    assert.equal(
      result.migrated,
      true
    );

    assert.equal(
      result.block.type,
      "cta"
    );
  }
);

test(
  "le sérialiseur convertit les champs Prisma",
  () => {
    const block =
      serializeBlock({
        id:
          "block-1",

        blockType:
          "text",

        displayOrder:
          3,

        status:
          "published",

        content: {
          text:
            "Contenu",
        },
      });

    assert.equal(
      block.type,
      "text"
    );

    assert.equal(
      block.position,
      3
    );
  }
);
