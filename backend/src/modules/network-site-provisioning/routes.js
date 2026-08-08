"use strict";

const express =
  require("express");

const {
  NetworkSiteProvisioningService,
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
        "NETWORK_PROVISIONING_ERROR",

      message:
        error?.message ||
        "Erreur de provisionnement des mini-sites.",

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

  const provisioningService =
    service ||
    new NetworkSiteProvisioningService({
      prisma,
    });

  router.get(
    "/network-site-provisioning/health",
    (_request, response) => {
      response.json(
        provisioningService
          .health()
      );
    }
  );

  router.get(
    "/network-site-provisioning/status",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await provisioningService
            .status({
              tenantId:
                request.tenantId ||
                request.tenant?.id ||
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

  router.post(
    "/network-site-provisioning/preview",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await provisioningService
            .preview({
              ...request.body,

              tenantId:
                request.tenantId ||
                request.tenant?.id ||
                request.body?.tenantId ||
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

  router.post(
    "/network-site-provisioning/execute",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await provisioningService
            .execute({
              ...request.body,

              tenantId:
                request.tenantId ||
                request.tenant?.id ||
                request.body?.tenantId ||
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
