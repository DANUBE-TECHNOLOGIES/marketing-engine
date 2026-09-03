"use strict";

const {
  CURRENT_BLOCK_SCHEMA_VERSION,
  BLOCK_STATUS_VALUES,
  isPlainObject,
  deepClone,
  normalizeBlockType,
  normalizeStatus,
  normalizePosition,
} = require("./block-schema");

const {
  CoreBlockRegistry,
} = require("./block-registry");

const {
  BlockFactory,
} = require("./block-factory");

const {
  migrateBlock,
  migrateBlocks,
  migrateCtaContent,
} = require("./block-migrator");

const {
  BlockValidator,
} = require("./block-validator");

const {
  serializeBlock,
  serializeBlocks,
} = require("./block-serializer");

module.exports = {
  CURRENT_BLOCK_SCHEMA_VERSION,
  BLOCK_STATUS_VALUES,

  CoreBlockRegistry,
  BlockFactory,
  BlockValidator,

  migrateBlock,
  migrateBlocks,
  migrateCtaContent,

  serializeBlock,
  serializeBlocks,

  isPlainObject,
  deepClone,
  normalizeBlockType,
  normalizeStatus,
  normalizePosition,
};
