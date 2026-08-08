"use strict";

const {
  BlockValidator,
} = require(
  "../page-builder/core"
);

function corePayloadError(
  validation
) {
  const first =
    validation.failures?.[0] ||
    {};

  const error =
    new Error(
      first.message ||
      "Un ou plusieurs blocs sont invalides."
    );

  error.status =
    400;

  error.statusCode =
    400;

  error.code =
    first.code ||
    "PAGE_BUILDER_CORE_VALIDATION_ERROR";

  error.details = {
    failureCount:
      validation.failureCount,

    failures:
      validation.failures,
  };

  return error;
}

function adaptBlockForCore(
  block,
  index
) {
  return {
    id:
      block.id ||
      null,

    type:
      block.type ||
      block.blockType,

    status:
      block.status ||
      "draft",

    position:
      block.position ??
      block.displayOrder ??
      index,

    content:
      block.content ||
      {},

    settings:
      block.settings ||
      {},

    seo:
      block.seo ||
      {},

    visibleDesktop:
      block.visibleDesktop !==
      false,

    visibleMobile:
      block.visibleMobile !==
      false,

    version:
      block.version,
  };
}

function adaptBlockForPersistence(
  original,
  validated,
  index
) {
  return {
    ...original,

    id:
      original?.id ||
      validated.id ||
      null,

    type:
      validated.type,

    status:
      validated.status,

    position:
      validated.position ??
      index,

    content:
      validated.content ||
      {},

    settings:
      validated.settings ||
      {},

    seo:
      validated.seo ||
      {},

    visibleDesktop:
      validated.visibleDesktop !==
      false,

    visibleMobile:
      validated.visibleMobile !==
      false,

    version:
      validated.version,
  };
}

function validateAndMigratePagePayload(
  payload,
  options = {}
) {
  const validator =
    options.validator ||
    new BlockValidator({
      migrate:
        options.migrate !==
        false,
    });

  const blocks =
    Array.isArray(
      payload?.blocks
    )
      ? payload.blocks
      : [];

  const coreInput =
    blocks.map(
      adaptBlockForCore
    );

  const validation =
    validator.validateMany(
      coreInput
    );

  if (!validation.valid) {
    throw corePayloadError(
      validation
    );
  }

  const migratedBlocks =
    validation.results.map(
      (
        result,
        index
      ) =>
        adaptBlockForPersistence(
          blocks[index],
          result.block,
          index
        )
    );

  return {
    payload: {
      ...payload,

      blocks:
        migratedBlocks,
    },

    summary: {
      blockCount:
        blocks.length,

      validCount:
        validation.validCount,

      migratedCount:
        validation.results.filter(
          (result) =>
            result.migrated
        ).length,

      migrations:
        validation.results
          .flatMap(
            (
              result,
              index
            ) =>
              result.migrations.map(
                (migration) => ({
                  index,

                  id:
                    blocks[index]?.id ||
                    null,

                  type:
                    blocks[index]?.type ||
                    null,

                  migration,
                })
              )
          ),
    },
  };
}

module.exports = {
  adaptBlockForCore,
  adaptBlockForPersistence,
  validateAndMigratePagePayload,
};
