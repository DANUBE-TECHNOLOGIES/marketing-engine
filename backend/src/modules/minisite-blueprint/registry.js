"use strict";

const {
  createBlueprintError,
} = require("./errors");

const {
  stableClone,
} = require("./utils");

const {
  validateBlueprintDefinition,
} = require("./validation");

class BlueprintRegistry {
  constructor(
    definitions = []
  ) {
    this.items =
      new Map();

    for (
      const definition
      of definitions
    ) {
      this.register(
        definition
      );
    }
  }

  register(
    definition
  ) {
    const validated =
      validateBlueprintDefinition(
        definition
      );

    const id =
      String(
        validated.id
      );

    if (
      this.items.has(id)
    ) {
      throw createBlueprintError(
        `Blueprint déjà enregistré : ${id}.`,
        "BLUEPRINT_DUPLICATE",
        500
      );
    }

    this.items.set(
      id,
      stableClone(
        validated
      )
    );

    return this;
  }

  get(
    id
  ) {
    const blueprint =
      this.items.get(
        String(id)
      );

    if (!blueprint) {
      throw createBlueprintError(
        `Blueprint inconnu : ${id}.`,
        "BLUEPRINT_UNKNOWN",
        404,
        {
          available:
            this.list().map(
              (item) =>
                item.id
            ),
        }
      );
    }

    return stableClone(
      blueprint
    );
  }

  list() {
    return [
      ...this.items.values(),
    ]
      .map(
        (item) => ({
          id:
            item.id,

          version:
            item.version,

          name:
            item.name,

          description:
            item.description,

          pageCount:
            item.pages.length,

          theme:
            item.theme,
        })
      )
      .sort(
        (left, right) =>
          left.id.localeCompare(
            right.id
          )
      );
  }

  has(
    id
  ) {
    return this.items.has(
      String(id)
    );
  }
}

module.exports = {
  BlueprintRegistry,
};
