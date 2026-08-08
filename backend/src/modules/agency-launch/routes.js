"use strict";

const express =
  require(
    "express"
  );

const {
  PrismaClient,
} =
  require(
    "@prisma/client"
  );

const {
  AgencyLaunchService,
} =
  require(
    "./service"
  );

function createAgencyLaunchRouter({
  prisma,
} = {}) {
  const database =
    prisma ||
    new PrismaClient();

  const service =
    new AgencyLaunchService({
      prisma:
        database,
    });

  const router =
    express.Router();

  router.get(
    "/health",
    (
      request,
      response
    ) => {
      response.json({
        ok:
          true,

        capability:
          "agency-launch",

        version:
          "1.0",
      });
    }
  );

  router.get(
    "/network",
    async (
      request,
      response,
      next
    ) => {
      try {
        response.json(
          await service.network()
        );
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/agencies/:agencyId/readiness",
    async (
      request,
      response,
      next
    ) => {
      try {
        response.json(
          await service.readiness(
            request.params
              .agencyId
          )
        );
      } catch (error) {
        next(error);
      }
    }
  );


  router.get(
    "/api/agency-launch/network",
    async (
      request,
      response
    ) => {
      try {
        const service =
          serviceFor(
            request
          );

        response.json(
          await service.networkStates()
        );
      } catch (error) {
        response
          .status(
            Number(
              error?.statusCode ||
              error?.status ||
              500
            )
          )
          .json({
            error:
              error?.code ||
              "AGENCY_LAUNCH_NETWORK_ERROR",

            message:
              error?.message ||
              "Impossible de calculer l'état réseau.",
          });
      }
    }
  );

return router;
}

module.exports = {
  createAgencyLaunchRouter,
};
