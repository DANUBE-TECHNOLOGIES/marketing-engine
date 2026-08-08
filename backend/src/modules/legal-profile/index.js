"use strict";

const {
  LegalProfileService,

  SHORT_TEXT_FIELDS,
  CONTENT_FIELDS,

  normalizeAgencyId,
  normalizeOptionalText,
  normalizeEmail,
  normalizeUrl,
  normalizeDate,
  mergeDefined,
} = require("./service");

const {
  legalProfileError,
} = require("./errors");

module.exports = {
  LegalProfileService,

  SHORT_TEXT_FIELDS,
  CONTENT_FIELDS,

  normalizeAgencyId,
  normalizeOptionalText,
  normalizeEmail,
  normalizeUrl,
  normalizeDate,
  mergeDefined,

  legalProfileError,
};
