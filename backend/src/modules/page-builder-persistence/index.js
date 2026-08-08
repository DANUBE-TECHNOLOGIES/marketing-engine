"use strict";

const {
  routes,
  errorStatus,
  sendError,
} = require("./routes");

const PageBuilderPersistenceService =
  require("./service");

const validation =
  require("./validation");

const payloadNormalizer =
  require(
    "./payload-normalizer"
  );

module.exports = {
  routes,
  errorStatus,
  sendError,

  PageBuilderPersistenceService,

  ...validation,
  ...payloadNormalizer,
};
