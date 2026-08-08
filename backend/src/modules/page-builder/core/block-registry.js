"use strict";

const {
  BlockRegistry:
    LegacyBlockRegistry,
} = require("../index");

class CoreBlockRegistry {
  constructor(
    definitions
  ) {
    this.registry =
      definitions
        ? new LegacyBlockRegistry(
            definitions
          )
        : new LegacyBlockRegistry();
  }

  has(
    type
  ) {
    return this.registry.has(
      type
    );
  }

  get(
    type
  ) {
    return this.registry.get(
      type
    );
  }

  list() {
    const health =
      this.registry.health();

    const blockTypes =
      health?.blockTypes ||
      [];

    return blockTypes.map(
      (type) =>
        this.get(type)
    );
  }

  validate(
    block
  ) {
    return this.registry
      .validate(block);
  }

  health() {
    const health =
      this.registry.health();

    return {
      status:
        "ok",

      capability:
        "page-builder-core-registry",

      definitionCount:
        health?.blockTypes
          ?.length ||
        0,

      blockTypes:
        health?.blockTypes ||
        [],
    };
  }
}

module.exports = {
  CoreBlockRegistry,
};
