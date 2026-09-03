"use strict";

const { BLOCK_DEFINITIONS } = require("./block-definitions");
const { BlockRegistry } = require("./block-registry");
const { PageBuilderService } = require("./service");
const {
  deepClone,
  isPlainObject,
  normalizeBlockEnvelope,
  validateFields,
  validateValue,
} = require("./validation");

module.exports = {
  BLOCK_DEFINITIONS,
  BlockRegistry,
  PageBuilderService,
  deepClone,
  isPlainObject,
  normalizeBlockEnvelope,
  validateFields,
  validateValue,
};
