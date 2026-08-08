"use strict";

const express =
  require("express");

const {
  PrismaClient,
} = require("@prisma/client");

const {
  PublicBrandLegalResolver,
} = require("./resolver");

const {
  findSiteBySlug,
  findSiteByAgencyId,
  publicSiteContract,
} = require("./site-lookup");

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

function applyPublicCache(
  response
) {
  response.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
  );
}

function createPublicBrandLegalRouter({
  prisma,
} = {}) {
  const database =
    prisma ||
    new PrismaClient();

  const resolver =
    new PublicBrandLegalResolver({
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
          "public-brand-legal-runtime",

        version:
          "1.0",

        lookupModes: [
          "site-slug",
          "agency-id",
        ],

        writeOperations:
          false,
      });
    }
  );

  router.get(
    "/sites/:siteSlug",
    asyncRoute(
      async (
        request,
        response
      ) => {
        const site =
          await findSiteBySlug({
            prisma:
              database,

            siteSlug:
              request.params
                .siteSlug,
          });

        const runtime =
          await resolver.resolve({
            agencyId:
              site.agencyId,

            tenantId:
              site.agency
                ?.tenantId ||
              undefined,
          });

        applyPublicCache(
          response
        );

        response.json({
          version:
            "1.0",

          site:
            publicSiteContract(
              site
            ),

          runtime,
        });
      }
    )
  );

  router.get(
    "/agencies/:agencyId",
    asyncRoute(
      async (
        request,
        response
      ) => {
        const site =
          await findSiteByAgencyId({
            prisma:
              database,

            agencyId:
              request.params
                .agencyId,
          });

        const runtime =
          await resolver.resolve({
            agencyId:
              site.agencyId,

            tenantId:
              site.agency
                ?.tenantId ||
              undefined,
          });

        applyPublicCache(
          response
        );

        response.json({
          version:
            "1.0",

          site:
            publicSiteContract(
              site
            ),

          runtime,
        });
      }
    )
  );

  return router;
}

module.exports = {
  createPublicBrandLegalRouter,
  asyncRoute,
  applyPublicCache,
};
