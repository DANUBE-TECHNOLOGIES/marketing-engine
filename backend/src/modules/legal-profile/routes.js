"use strict";

const express =
  require("express");

const {
  PrismaClient,
} = require("@prisma/client");

const {
  LegalProfileService,
  normalizeAgencyId,
} = require("./service");

const {
  resolveTenant,
} = require(
  "../brand-assets/tenant-resolver"
);

function asyncRoute(
  handler
) {
  return (
    request,
    response,
    next
  ) => {
    Promise.resolve(
      handler(
        request,
        response,
        next
      )
    ).catch(next);
  };
}

function createLegalProfileRouter({
  prisma,
} = {}) {
  const database =
    prisma ||
    new PrismaClient();

  const service =
    new LegalProfileService({
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
          "legal-profile",

        inheritance:
          "tenant-to-agency",

        sections: [
          "legal-notice",
          "privacy",
          "cookies",
          "terms",
        ],
      });
    }
  );

  router.get(
    "/",
    asyncRoute(
      async (
        request,
        response
      ) => {
        const tenant =
          await resolveTenant(
            database,
            request
          );

        const agencyId =
          normalizeAgencyId(
            request.query
              .agencyId
          );

        const result =
          await service
            .getResolved({
              tenantId:
                tenant.id,

              agencyId,
            });

        response.json(
          result
        );
      }
    )
  );

  router.put(
    "/",
    express.json({
      limit:
        "2mb",
    }),
    asyncRoute(
      async (
        request,
        response
      ) => {
        const tenant =
          await resolveTenant(
            database,
            request
          );

        const agencyId =
          normalizeAgencyId(
            request.query
              .agencyId ??
            request.body
              ?.agencyId
          );

        const profile =
          await service.save({
            tenantId:
              tenant.id,

            agencyId,

            input:
              request.body ||
              {},
          });

        const resolved =
          await service
            .getResolved({
              tenantId:
                tenant.id,

              agencyId,
            });

        response.json({
          saved:
            true,

          profile,

          resolved:
            resolved.resolved,

          inherited:
            resolved.inherited,
        });
      }
    )
  );

  router.delete(
    "/override",
    asyncRoute(
      async (
        request,
        response
      ) => {
        const tenant =
          await resolveTenant(
            database,
            request
          );

        const agencyId =
          normalizeAgencyId(
            request.query
              .agencyId
          );

        const result =
          await service
            .removeOverride({
              tenantId:
                tenant.id,

              agencyId,
            });

        response.json(
          result
        );
      }
    )
  );

  return router;
}

module.exports = {
  createLegalProfileRouter,
  asyncRoute,
};
