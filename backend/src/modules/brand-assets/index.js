"use strict";

const {
  BrandAssetService,
  ALLOWED_KINDS,
  DEFAULT_MAX_FILE_SIZE,
  sanitizeOriginalName,
  normalizeOptionalText,
} = require("./service");

const {
  LocalBrandAssetStorage,
  sanitizeSegment,
  assertSafeStorageKey,
} = require("./storage");

const {
  ALLOWED_MIME_TYPES,
  EXTENSION_BY_MIME,
  detectMimeType,
  validateFileSignature,
} = require("./file-signatures");

const {
  extractImageDimensions,
  pngDimensions,
  jpegDimensions,
  webpDimensions,
} = require("./image-dimensions");

const {
  brandAssetError,
} = require("./errors");

module.exports = {
  BrandAssetService,
  LocalBrandAssetStorage,

  ALLOWED_KINDS,
  ALLOWED_MIME_TYPES,
  EXTENSION_BY_MIME,
  DEFAULT_MAX_FILE_SIZE,

  sanitizeOriginalName,
  normalizeOptionalText,
  sanitizeSegment,
  assertSafeStorageKey,

  detectMimeType,
  validateFileSignature,

  extractImageDimensions,
  pngDimensions,
  jpegDimensions,
  webpDimensions,

  brandAssetError,
};
