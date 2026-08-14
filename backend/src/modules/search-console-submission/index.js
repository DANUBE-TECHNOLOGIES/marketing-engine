"use strict";

const { routes } = require("./routes");
const { SearchConsoleSubmissionService, ACTION_TYPE, MODE } = require("./service");
const {
  SEARCH_CONSOLE_API_ROOT,
  DisabledSearchConsoleProvider,
  GoogleSearchConsoleProvider,
  validateSearchConsoleSubmissionTarget,
} = require("./provider");
const {
  SEARCH_CONSOLE_SCOPE,
  createGoogleAccessTokenProvider,
  resolveGoogleAuthConstructor,
} = require("./auth");
const {
  createConfiguredSearchConsoleProvider,
  enabled,
} = require("./config");

module.exports = {
  routes,
  SearchConsoleSubmissionService,
  DisabledSearchConsoleProvider,
  GoogleSearchConsoleProvider,
  SEARCH_CONSOLE_API_ROOT,
  SEARCH_CONSOLE_SCOPE,
  createGoogleAccessTokenProvider,
  resolveGoogleAuthConstructor,
  createConfiguredSearchConsoleProvider,
  enabled,
  validateSearchConsoleSubmissionTarget,
  ACTION_TYPE,
  MODE,
};