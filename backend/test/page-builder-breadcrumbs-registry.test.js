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

test(
  "le registre contient breadcrumbs",
  () => {
    const registry =
      new BlockRegistry();

    assert.equal(
      registry.has(
        "breadcrumbs"
      ),
      true
    );

    const definition =
      registry.get(
        "breadcrumbs"
      );

    assert.equal(
      definition.type,
      "breadcrumbs"
    );

    assert.equal(
      definition.singleton,
      true
    );

    assert.equal(
      definition.fields
        ?.items
        ?.type,
      "array"
    );
  }
);

test(
  "le registre refuse toujours un type inconnu",
  () => {
    const registry =
      new BlockRegistry();

    assert.throws(
      () =>
        registry.get(
          "unknown-test-block"
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
