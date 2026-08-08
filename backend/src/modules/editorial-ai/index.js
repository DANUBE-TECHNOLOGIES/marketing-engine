"use strict";

const express = require("express");

const {
  createEditorialAiRouter,
} = require("./routes");

const {
  EditorialAiService,
} = require("./service");

function routes({
  service,
} = {}) {
  const rootRouter =
    express.Router();

  const editorialService =
    service ||
    new EditorialAiService();

  const editorialRouter =
    createEditorialAiRouter({
      express,
      service:
        editorialService,
    });

  rootRouter.use(
    "/editorial-ai",
    editorialRouter
  );

  return rootRouter;
}

function health() {
  return new EditorialAiService()
    .health();
}

module.exports = {
  basePath:
    "/editorial-ai",

  routes,
  health,

  createRouter({
    express:
      expressInstance =
        express,

    service,
  } = {}) {
    return createEditorialAiRouter({
      express:
        expressInstance,

      service:
        service ||
        new EditorialAiService(),
    });
  },

  createEditorialAiRouter,
  EditorialAiService,
};
