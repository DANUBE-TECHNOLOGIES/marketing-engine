"use strict";

const { BLOCK_DEFINITIONS } = require("./block-definitions");
const { pageBuilderError } = require("./errors");
const {
  deepClone,
  normalizeBlockEnvelope,
  validateFields,
} = require("./validation");

class BlockRegistry {
  constructor(definitions = BLOCK_DEFINITIONS) {
    this.definitions = new Map();

    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register(definition) {
    if (
      !definition ||
      typeof definition !== "object"
    ) {
      throw pageBuilderError(
        "La définition d’un bloc doit être un objet.",
        "INVALID_BLOCK_DEFINITION",
        500
      );
    }

    const type = String(definition.type || "")
      .trim()
      .toLowerCase();

    if (!/^[a-z][a-z0-9_-]*$/.test(type)) {
      throw pageBuilderError(
        `Type de bloc invalide : ${type || "(vide)"}.`,
        "INVALID_BLOCK_TYPE",
        500
      );
    }

    if (this.definitions.has(type)) {
      throw pageBuilderError(
        `Le bloc ${type} est déjà enregistré.`,
        "DUPLICATE_BLOCK_TYPE",
        500,
        { type }
      );
    }

    this.definitions.set(
      type,
      Object.freeze({
        ...deepClone(definition),
        type,
      })
    );

    return this;
  }

  has(type) {
    return this.definitions.has(
      String(type || "").trim().toLowerCase()
    );
  }

  get(type) {
    const normalizedType = String(type || "")
      .trim()
      .toLowerCase();

    const definition = this.definitions.get(normalizedType);

    if (!definition) {
      throw pageBuilderError(
        `Type de bloc inconnu : ${normalizedType || "(vide)"}.`,
        "UNKNOWN_BLOCK_TYPE",
        400,
        { type: normalizedType }
      );
    }

    return deepClone(definition);
  }

  list({ category } = {}) {
    return [...this.definitions.values()]
      .filter(
        (definition) =>
          !category ||
          definition.category === category
      )
      .map((definition) => deepClone(definition))
      .sort((left, right) =>
        left.label.localeCompare(right.label, "fr")
      );
  }

  categories() {
    return [
      ...new Set(
        [...this.definitions.values()]
          .map((definition) => definition.category)
          .filter(Boolean)
      ),
    ].sort();
  }

  create(type, overrides = {}) {
    const definition = this.get(type);

    const content = {
      ...deepClone(definition.defaults || {}),
      ...deepClone(overrides.content || {}),
    };

    return this.validate({
      type: definition.type,
      status: overrides.status || "draft",
      position: overrides.position ?? 0,
      settings: overrides.settings || {},
      content,
    });
  }

  validate(input) {
    const block = normalizeBlockEnvelope(input);
    const definition = this.get(block.type);

    return {
      ...block,
      content: validateFields(
        block.content,
        definition.fields || {},
        "content"
      ),
    };
  }

  validatePage(blocks) {
    if (!Array.isArray(blocks)) {
      throw pageBuilderError(
        "La liste des blocs doit être un tableau.",
        "INVALID_PAGE_BLOCKS",
        400
      );
    }

    const validated = blocks.map((block, index) =>
      this.validate({
        ...block,
        position: block.position ?? index,
      })
    );

    const positions = new Set();
    const singletonTypes = new Set();

    for (const block of validated) {
      if (positions.has(block.position)) {
        throw pageBuilderError(
          `La position ${block.position} est utilisée plusieurs fois.`,
          "DUPLICATE_BLOCK_POSITION",
          400,
          { position: block.position }
        );
      }

      positions.add(block.position);

      const definition = this.get(block.type);

      if (definition.singleton) {
        if (singletonTypes.has(block.type)) {
          throw pageBuilderError(
            `Le bloc ${block.type} ne peut apparaître qu’une fois par page.`,
            "DUPLICATE_SINGLETON_BLOCK",
            400,
            { type: block.type }
          );
        }

        singletonTypes.add(block.type);
      }
    }

    return validated.sort(
      (left, right) => left.position - right.position
    );
  }

  health() {
    const definitions = this.list();

    return {
      status: "ok",
      capability: "page-builder-block-registry",
      blockTypes: definitions.length,
      categories: this.categories(),
      singletonTypes: definitions
        .filter((definition) => definition.singleton)
        .map((definition) => definition.type),
    };
  }
}

module.exports = {
  BlockRegistry,
};
