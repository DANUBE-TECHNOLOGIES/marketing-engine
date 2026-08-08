"use strict";

const express =
  require("express");

const {
  MiniSiteBlueprintService,
} = require("./service");

function sendError(
  response,
  error
) {
  response
    .status(
      Number(
        error?.status ||
        500
      )
    )
    .json({
      error:
        error?.code ||
        "MINISITE_BLUEPRINT_ERROR",

      message:
        error?.message ||
        "Erreur du Blueprint Engine.",

      details:
        error?.details ||
        {},
    });
}

function routes({
  service,
} = {}) {
  const router =
    express.Router();

  const blueprintService =
    service ||
    new MiniSiteBlueprintService();

  router.get(
    "/minisite-blueprints/health",
    (
      _request,
      response
    ) => {
      response.json(
        blueprintService
          .health()
      );
    }
  );

  router.get(
    "/minisite-blueprints",
    (
      _request,
      response
    ) => {
      response.json(
        blueprintService
          .list()
      );
    }
  );

  router.get(
    "/minisite-blueprints/:blueprintId",
    (
      request,
      response
    ) => {
      try {
        response.json(
          blueprintService
            .get(
              request.params
                .blueprintId
            )
        );
      } catch (error) {
        sendError(
          response,
          error
        );
      }
    }
  );

  router.post(
    "/minisite-blueprints/preview",
    (
      request,
      response
    ) => {
      try {
        response.json(
          blueprintService
            .preview({
              ...request.body,

              agencyId:
                request.body
                  ?.agencyId ||
                request.params
                  ?.agencyId ||
                null,
            })
        );
      } catch (error) {
        sendError(
          response,
          error
        );
      }
    }
  );

  return router;
}

module.exports = {
  routes,
  sendError,
};
