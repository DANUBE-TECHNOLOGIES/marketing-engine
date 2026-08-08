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

function definition(
  type
) {
  return {
    type,

    label:
      type,

    category:
      "test",

    description:
      "Définition de test.",

    singleton:
      false,

    defaults:
      {},

    fields:
      {},
  };
}

test(
  "accepte un type simple",
  () => {
    const registry =
      new BlockRegistry([]);

    registry.register(
      definition(
        "text"
      )
    );

    assert.equal(
      registry.has(
        "text"
      ),
      true
    );
  }
);

test(
  "accepte un type avec underscore",
  () => {
    const registry =
      new BlockRegistry([]);

    registry.register(
      definition(
        "rich_text"
      )
    );

    assert.equal(
      registry.has(
        "rich_text"
      ),
      true
    );
  }
);

test(
  "accepte un type avec tiret",
  () => {
    const registry =
      new BlockRegistry([]);

    registry.register(
      definition(
        "destination-grid"
      )
    );

    assert.equal(
      registry.has(
        "destination-grid"
      ),
      true
    );
  }
);

test(
  "refuse un type commençant par un chiffre",
  () => {
    const registry =
      new BlockRegistry([]);

    assert.throws(
      () =>
        registry.register(
          definition(
            "1-invalid"
          )
        ),
      (error) => {
        assert.equal(
          error.code,
          "INVALID_BLOCK_TYPE"
        );

        return true;
      }
    );
  }
);

test(
  "refuse les espaces et caractères spéciaux",
  () => {
    for (
      const type
      of [
        "destination grid",
        "destination/grid",
        "destination.grid",
      ]
    ) {
      const registry =
        new BlockRegistry([]);

      assert.throws(
        () =>
          registry.register(
            definition(type)
          ),
        (error) => {
          assert.equal(
            error.code,
            "INVALID_BLOCK_TYPE"
          );

          return true;
        },
        `${type} doit être refusé`
      );
    }
  }
);

test(
  "normalise les majuscules en minuscules",
  () => {
    const registry =
      new BlockRegistry([]);

    registry.register(
      definition(
        "DestinationGrid"
      )
    );

    assert.equal(
      registry.has(
        "destinationgrid"
      ),
      true
    );

    assert.equal(
      registry.has(
        "DestinationGrid"
      ),
      true
    );
  }
);
