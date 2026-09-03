"use strict";

function sitePublicationError(
  code,
  message,
  statusCode = 400,
  details = {}
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  error.statusCode =
    statusCode;

  error.details =
    details;

  return error;
}

function normalizeSitePublicationError(
  error
) {
  if (
    error?.code &&
    error?.statusCode
  ) {
    return error;
  }

  return sitePublicationError(
    "SITE_PUBLICATION_INTERNAL_ERROR",
    error?.message ||
      "Une erreur interne est survenue pendant la publication.",
    500,
    {}
  );
}

module.exports = {
  normalizeSitePublicationError,
  sitePublicationError,
};
