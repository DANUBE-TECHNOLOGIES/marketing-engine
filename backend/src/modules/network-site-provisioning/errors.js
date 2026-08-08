"use strict";

function createProvisioningError(
  message,
  code,
  status = 400,
  details = {}
) {
  const error = new Error(message);

  error.code = code;
  error.status = status;
  error.details = details;

  return error;
}

module.exports = {
  createProvisioningError,
};
