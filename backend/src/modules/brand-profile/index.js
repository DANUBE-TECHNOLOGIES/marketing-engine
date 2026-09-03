"use strict";

const {
  BrandProfileService,
  ASSET_FIELDS,
  COLOR_FIELDS,
  TEXT_FIELDS,
  normalizeAgencyId,
  normalizeOptionalText,
  normalizeColor,
  mergeDefined,
} = require("./service");

const {
  brandProfileError,
} = require("./errors");

module.exports = {
  BrandProfileService,

  ASSET_FIELDS,
  COLOR_FIELDS,
  TEXT_FIELDS,

  normalizeAgencyId,
  normalizeOptionalText,
  normalizeColor,
  mergeDefined,

  brandProfileError,
};
