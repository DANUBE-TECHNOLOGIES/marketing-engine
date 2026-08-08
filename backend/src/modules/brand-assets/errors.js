"use strict";

function brandAssetError(
  code,
  message,
  details = {},
  statusCode = 400
) {
  const error =
    new Error(message);

  error.code =
    code;

  error.status =
    statusCode;

  error.statusCode =
    statusCode;

  error.details =
    details;

  return error;
}

module.exports = {
  brandAssetError,
};
