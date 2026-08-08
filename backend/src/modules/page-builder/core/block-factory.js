"use strict";

const {
  CoreBlockRegistry,
} = require("./block-registry");

const {
  CURRENT_BLOCK_SCHEMA_VERSION,
  deepClone,
  isPlainObject,
  normalizeStatus,
  normalizePosition,
} = require("./block-schema");

class BlockFactory {
  constructor({
    registry,
  } = {}) {
    this.registry =
      registry ||
      new CoreBlockRegistry();
  }

  create(
    type,
    overrides = {}
  ) {
    const definition =
      this.registry.get(type);

    const content = {
      ...deepClone(
        definition.defaults ||
        {}
      ),

      ...(
        isPlainObject(
          overrides.content
        )
          ? deepClone(
              overrides.content
            )
          : {}
      ),
    };

    return {
      id:
        overrides.id ||
        null,

      type:
        definition.type,

      status:
        normalizeStatus(
          overrides.status
        ),

      position:
        normalizePosition(
          overrides.position ??
          overrides.displayOrder,
          0
        ),

      content,

      settings:
        isPlainObject(
          overrides.settings
        )
          ? deepClone(
              overrides.settings
            )
          : {},

      seo:
        isPlainObject(
          overrides.seo
        )
          ? deepClone(
              overrides.seo
            )
          : {},

      visibleDesktop:
        overrides
          .visibleDesktop !==
        false,

      visibleMobile:
        overrides
          .visibleMobile !==
        false,

      version:
        Number.isInteger(
          overrides.version
        )
          ? overrides.version
          : CURRENT_BLOCK_SCHEMA_VERSION,

      schemaVersion:
        CURRENT_BLOCK_SCHEMA_VERSION,
    };
  }
}

module.exports = {
  BlockFactory,
};
