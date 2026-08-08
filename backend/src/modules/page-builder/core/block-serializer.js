"use strict";

const {
  deepClone,
  isPlainObject,
  normalizeBlockType,
  normalizeStatus,
  normalizePosition,
} = require("./block-schema");

function serializeBlock(
  input
) {
  const source =
    isPlainObject(input)
      ? input
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
      normalizeStatus(
        source.status
      ),

    position:
      normalizePosition(
        source.position ??
        source.displayOrder,
        0
      ),

    content:
      isPlainObject(
        source.content
      )
        ? deepClone(
            source.content
          )
        : {},

    settings:
      isPlainObject(
        source.settings
      )
        ? deepClone(
            source.settings
          )
        : {},

    seo:
      isPlainObject(
        source.seo
      )
        ? deepClone(
            source.seo
          )
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
        : 1,

    schemaVersion:
      Number.isInteger(
        source.schemaVersion
      )
        ? source.schemaVersion
        : 1,
  };
}

function serializeBlocks(
  blocks
) {
  return (
    Array.isArray(blocks)
      ? blocks
      : []
  ).map(
    serializeBlock
  );
}

module.exports = {
  serializeBlock,
  serializeBlocks,
};
