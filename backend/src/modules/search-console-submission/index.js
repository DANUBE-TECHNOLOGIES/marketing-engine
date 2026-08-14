"use strict";

const { routes } = require("./routes");
const { SearchConsoleSubmissionService, ACTION_TYPE, MODE } = require("./service");
const {
  SEARCH_CONSOLE_API_ROOT,
  DisabledSearchConsoleProvider,
  GoogleSearchConsoleProvider,
  validateSearchConsoleSubmissionTarget,
} = require("./provider");

module.exports = {
  routes,
  SearchConsoleSubmissionService,
  DisabledSearchConsoleProvider,
  GoogleSearchConsoleProvider,
  SEARCH_CONSOLE_API_ROOT,
  validateSearchConsoleSubmissionTarget,
  ACTION_TYPE,
  MODE,
};