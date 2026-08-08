"use strict";

const {
  CURRENT_BLOCK_SCHEMA_VERSION,
  deepClone,
  isPlainObject,
  normalizeBlockType,
  normalizeStatus,
  normalizePosition,
} = require("./block-schema");

function normalizeCtaObject(
  value,
  fallback
) {
  if (
    isPlainObject(value) &&
    String(
      value.label || ""
    ).trim() &&
    String(
      value.href || ""
    ).trim()
  ) {
    return {
      label:
        String(value.label)
          .trim(),

      href:
        String(value.href)
          .trim(),
    };
  }

  return deepClone(
    fallback
  );
}

function migrateCtaContent(
  content
) {
  const migrated = {
    ...content,
  };

  const legacyCta =
    isPlainObject(
      migrated.cta
    )
      ? migrated.cta
      : null;

  const legacyPrimary =
    isPlainObject(
      migrated.primary
    )
      ? migrated.primary
      : null;

  const fallbackPrimary = {
    label:
      String(
        migrated.buttonLabel ||
        migrated.ctaLabel ||
        legacyCta?.label ||
        legacyPrimary?.label ||
        "Demander un devis"
      ).trim(),

    href:
      String(
        migrated.buttonHref ||
        migrated.ctaHref ||
        legacyCta?.href ||
        legacyPrimary?.href ||
        "#contact"
      ).trim(),
  };

  migrated.primaryCta =
    normalizeCtaObject(
      migrated.primaryCta,
      fallbackPrimary
    );

  if (
    migrated.secondaryCta !==
      null &&
    migrated.secondaryCta !==
      undefined
  ) {
    migrated.secondaryCta =
      normalizeCtaObject(
        migrated.secondaryCta,
        null
      );
  } else {
    migrated.secondaryCta =
      null;
  }

  if (
    !String(
      migrated.title || ""
    ).trim()
  ) {
    migrated.title =
      "Votre voyage commence ici";
  }

  if (
    migrated.text ===
      undefined ||
    migrated.text ===
      null
  ) {
    migrated.text =
      "";
  }

  if (
    !String(
      migrated.style || ""
    ).trim()
  ) {
    migrated.style =
      "primary";
  }

  return migrated;
}

function migrateBlock(
  input,
  options = {}
) {
  const source =
    isPlainObject(input)
      ? deepClone(input)
      : {};

  const type =
    normalizeBlockType(
      source.type ||
      source.blockType
    );

  const position =
    normalizePosition(
      source.position ??
      source.displayOrder,
      options.position ??
      0
    );

  const content =
    isPlainObject(
      source.content
    )
      ? source.content
      : {};

  let migratedContent =
    deepClone(content);

  const appliedMigrations =
    [];

  if (
    type === "cta" &&
    !isPlainObject(
      migratedContent.primaryCta
    )
  ) {
    migratedContent =
      migrateCtaContent(
        migratedContent
      );

    appliedMigrations.push(
      "cta:add-primary-cta"
    );
  }

  const migrated = {
    id:
      source.id ||
      null,

    type,

    status:
      normalizeStatus(
        source.status
      ),

    position,

    content:
      migratedContent,

    settings:
      isPlainObject(
        source.settings
      )
        ? source.settings
        : {},

    seo:
      isPlainObject(
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
      Number.isInteger(
        source.version
      )
        ? source.version
        : CURRENT_BLOCK_SCHEMA_VERSION,

    schemaVersion:
      CURRENT_BLOCK_SCHEMA_VERSION,
  };

  return {
    block:
      migrated,

    migrated:
      appliedMigrations.length >
      0,

    migrations:
      appliedMigrations,
  };
}

function migrateBlocks(
  blocks
) {
  return (
    Array.isArray(blocks)
      ? blocks
      : []
  ).map(
    (block, index) =>
      migrateBlock(
        block,
        {
          position:
            index,
        }
      )
  );
}

module.exports = {
  migrateBlock,
  migrateBlocks,
  migrateCtaContent,
};
