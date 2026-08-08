"use strict";

const {
  BlockFactory,
  BlockValidator,
  serializeBlock,
  normalizeBlockType,
} = require(
  "../page-builder/core"
);

function blueprintCoreError(
  message,
  details = {}
) {
  const error =
    new Error(message);

  error.code =
    "BLUEPRINT_CORE_ADAPTER_ERROR";

  error.status =
    500;

  error.statusCode =
    500;

  error.details =
    details;

  return error;
}

function normalizeBlueprintBlock(
  block,
  index = 0
) {
  const source =
    block &&
    typeof block === "object"
      ? block
      : {};

  return {
    id:
      source.id ||
      null,

    type:
      normalizeBlockType(
        source.type ||
        source.blockType
      ),

    status:
      source.status ||
      "draft",

    position:
      source.position ??
      source.displayOrder ??
      index,

    content:
      source.content &&
      typeof source.content ===
        "object" &&
      !Array.isArray(
        source.content
      )
        ? source.content
        : {},

    settings:
      source.settings &&
      typeof source.settings ===
        "object" &&
      !Array.isArray(
        source.settings
      )
        ? source.settings
        : {},

    seo:
      source.seo &&
      typeof source.seo ===
        "object" &&
      !Array.isArray(
        source.seo
      )
        ? source.seo
        : {},

    visibleDesktop:
      source.visibleDesktop !==
      false,

    visibleMobile:
      source.visibleMobile !==
      false,

    version:
      source.version,
  };
}

class BlueprintCoreAdapter {
  constructor({
    factory,
    validator,
  } = {}) {
    this.factory =
      factory ||
      new BlockFactory();

    this.validator =
      validator ||
      new BlockValidator({
        migrate:
          true,
      });
  }

  create(
    type,
    overrides = {}
  ) {
    const block =
      this.factory.create(
        type,
        overrides
      );

    return this.validate(
      block
    ).block;
  }

  validate(
    block,
    index = 0
  ) {
    return this.validator.validate(
      normalizeBlueprintBlock(
        block,
        index
      )
    );
  }

  adaptBlock(
    block,
    index = 0
  ) {
    const result =
      this.validate(
        block,
        index
      );

    return {
      block:
        serializeBlock(
          result.block
        ),

      migrated:
        result.migrated,

      migrations:
        result.migrations,
    };
  }

  adaptBlocks(
    blocks
  ) {
    if (!Array.isArray(blocks)) {
      throw blueprintCoreError(
        "La liste des blocs Blueprint doit être un tableau."
      );
    }

    const results =
      blocks.map(
        (block, index) =>
          this.adaptBlock(
            block,
            index
          )
      );

    return {
      blocks:
        results.map(
          (result) =>
            result.block
        ),

      summary: {
        blockCount:
          results.length,

        migratedCount:
          results.filter(
            (result) =>
              result.migrated
          ).length,

        migrations:
          results.flatMap(
            (
              result,
              index
            ) =>
              result.migrations.map(
                (migration) => ({
                  index,

                  type:
                    result.block.type,

                  migration,
                })
              )
          ),

        blockTypes:
          [
            ...new Set(
              results.map(
                (result) =>
                  result.block.type
              )
            ),
          ].sort(),
      },
    };
  }

  adaptPage(
    page
  ) {
    if (
      !page ||
      typeof page !==
        "object"
    ) {
      throw blueprintCoreError(
        "Page Blueprint invalide."
      );
    }

    const adapted =
      this.adaptBlocks(
        page.blocks ||
        []
      );

    return {
      page: {
        ...page,

        blocks:
          adapted.blocks,
      },

      summary:
        adapted.summary,
    };
  }

  adaptSite(
    site
  ) {
    if (
      !site ||
      typeof site !==
        "object"
    ) {
      throw blueprintCoreError(
        "Site Blueprint invalide."
      );
    }

    const pages =
      Array.isArray(site.pages)
        ? site.pages
        : [];

    const adaptedPages =
      pages.map(
        (page) =>
          this.adaptPage(page)
      );

    return {
      site: {
        ...site,

        pages:
          adaptedPages.map(
            (entry) =>
              entry.page
          ),
      },

      summary: {
        pageCount:
          adaptedPages.length,

        blockCount:
          adaptedPages.reduce(
            (
              total,
              entry
            ) =>
              total +
              entry.summary
                .blockCount,
            0
          ),

        migratedCount:
          adaptedPages.reduce(
            (
              total,
              entry
            ) =>
              total +
              entry.summary
                .migratedCount,
            0
          ),

        blockTypes:
          [
            ...new Set(
              adaptedPages.flatMap(
                (entry) =>
                  entry.summary
                    .blockTypes
              )
            ),
          ].sort(),

        migrations:
          adaptedPages.flatMap(
            (
              entry,
              pageIndex
            ) =>
              entry.summary
                .migrations
                .map(
                  (migration) => ({
                    pageIndex,
                    ...migration,
                  })
                )
          ),
      },
    };
  }
}

module.exports = {
  BlueprintCoreAdapter,
  normalizeBlueprintBlock,
  blueprintCoreError,
};
