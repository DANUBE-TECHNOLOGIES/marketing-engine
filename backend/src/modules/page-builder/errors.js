"use strict";

function pageBuilderError(message, code, statusCode = 400, details = undefined) {
  return Object.assign(
    new Error(message),
    {
      code,
      statusCode,
      ...(details === undefined ? {} : { details }),
    }
  );
}

module.exports = {
  pageBuilderError,
};
