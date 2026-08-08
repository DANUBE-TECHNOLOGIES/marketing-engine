"use strict";

const {
  CoreBlockRegistry,
} = require("./block-registry");

const {
  migrateBlock,
} = require("./block-migrator");

class BlockValidator {
  constructor({
    registry,
    migrate = true,
  } = {}) {
    this.registry =
      registry ||
      new CoreBlockRegistry();

    this.migrate =
      migrate !== false;
  }

  validate(
    input
  ) {
    const migration =
      this.migrate
        ? migrateBlock(input)
        : {
            block:
              input,

            migrated:
              false,

            migrations:
              [],
          };

    const validated =
      this.registry.validate(
        migration.block
      );

    return {
      block:
        validated,

      migrated:
        migration.migrated,

      migrations:
        migration.migrations,
    };
  }

  validateMany(
    blocks
  ) {
    const results = [];
    const failures = [];

    for (
      const [
        index,
        block,
      ]
      of (
        Array.isArray(blocks)
          ? blocks
          : []
      ).entries()
    ) {
      try {
        results.push(
          this.validate(block)
        );
      } catch (error) {
        failures.push({
          index,

          id:
            block?.id ||
            null,

          type:
            block?.type ||
            block?.blockType ||
            null,

          code:
            error?.code ||
            "BLOCK_VALIDATION_ERROR",

          message:
            error?.message ||
            "Bloc invalide.",

          details:
            error?.details ||
            {},
        });
      }
    }

    return {
      valid:
        failures.length === 0,

      total:
        results.length +
        failures.length,

      validCount:
        results.length,

      failureCount:
        failures.length,

      results,

      failures,
    };
  }
}

module.exports = {
  BlockValidator,
};
