"use strict";

const express =
  require("express");

const {
  MiniSiteBlueprintPersistenceService,
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
        "BLUEPRINT_PERSISTENCE_ERROR",

      message:
        error?.message ||
        "Erreur du planificateur de persistance.",

      details:
        error?.details ||
        {},
    });
}

function routes({
  prisma,
  service,
} = {}) {
  const router =
    express.Router();

  function getService(
    request
  ) {
    return (
      service ||
      new MiniSiteBlueprintPersistenceService({
        prisma,

        tenantId:
          request.tenantId ||
          request.tenant?.id ||
          null,
      })
    );
  }

  router.get(
    "/minisite-blueprint-persistence/health",
    (
      request,
      response
    ) => {
      response.json(
        getService(
          request
        ).health()
      );
    }
  );

  router.post(
    "/minisite-blueprint-persistence/agencies/:agencyId/preview",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await getService(
            request
          ).previewAgency({
            agencyId:
              request.params
                .agencyId,

            blueprint:
              request.body
                ?.blueprint,
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

  router.post(
    "/minisite-blueprint-persistence/agencies/:agencyId/apply",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await getService(
            request
          ).applyAgency({
            agencyId:
              request.params
                .agencyId,

            blueprint:
              request.body
                ?.blueprint,

            dryRun:
              request.body
                ?.dryRun !==
              false,

            confirm:
              request.body
                ?.confirm ===
              true,
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

  router.post(
    "/minisite-blueprint-persistence/network/preview",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await getService(
            request
          ).previewNetwork()
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
