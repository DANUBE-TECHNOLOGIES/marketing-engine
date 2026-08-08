"use strict";

const ALLOWED_PAGE_TYPES =
  new Set([
    "HOME",
    "AGENCY",
    "SERVICES",
    "CONTACT",
  ]);

function composerError(
  message,
  code,
  statusCode =
    400
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  error.statusCode =
    statusCode;

  return error;
}

function normalizePageType(
  value
) {
  const pageType =
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    !ALLOWED_PAGE_TYPES.has(
      pageType
    )
  ) {
    throw composerError(
      `pageType invalide : ${pageType || "(vide)"}`,
      "INVALID_COMPOSER_PAGE_TYPE",
      400
    );
  }

  return pageType;
}

function normalizeAgencyId(
  value
) {
  const agencyId =
    Number(
      value
    );

  if (
    !Number.isInteger(
      agencyId
    ) ||
    agencyId <=
      0
  ) {
    throw composerError(
      "agencyId invalide.",
      "INVALID_COMPOSER_AGENCY_ID",
      400
    );
  }

  return agencyId;
}

function sanitizeInstructions(
  value
) {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return "";
  }

  return String(
    value
  )
    .trim()
    .slice(
      0,
      4000
    );
}

module.exports = {
  ALLOWED_PAGE_TYPES,
  composerError,
  normalizePageType,
  normalizeAgencyId,
  sanitizeInstructions,
};
