"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  BlockRegistry,
} = require(
  "../src/modules/page-builder"
);

const EXPECTED_DATABASE_TYPES = [
  "breadcrumbs",
  "contact",
  "cta",
  "destination-grid",
  "faq",
  "features",
  "form",
  "hero",
  "hours",
  "legal",
  "logos",
  "map",
  "reviews",
  "services",
  "team",
  "text",
];

test(
  "le registre couvre tous les types présents en base",
  () => {
    const registry =
      new BlockRegistry();

    for (
      const type
      of EXPECTED_DATABASE_TYPES
    ) {
      assert.equal(
        registry.has(type),
        true,
        `${type} doit être enregistré`
      );
    }
  }
);

test(
  "le registre couvre l’alias historique partners",
  () => {
    const registry =
      new BlockRegistry();

    assert.equal(
      registry.has(
        "partners"
      ),
      true
    );
  }
);

test(
  "un type réellement inconnu reste refusé",
  () => {
    const registry =
      new BlockRegistry();

    assert.throws(
      () =>
        registry.get(
          "unknown-production-block"
        ),
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
