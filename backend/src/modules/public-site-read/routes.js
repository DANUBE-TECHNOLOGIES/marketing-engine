"use strict";

const express =
  require("express");

const {
  PrismaClient,
} = require("@prisma/client");

const {
  PublicSiteReadService,
} = require("./service");

function createPublicSiteReadRouter({
  prisma,
} = {}) {
  const database =
    prisma ||
    new PrismaClient();

  const service =
    new PublicSiteReadService({
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
          "public-site-read",

        version:
          "1.0",

        writeOperations:
          false,
      });
    }
  );

  router.get(
    "/sites/:siteSlug",
    async (
      request,
      response,
      next
    ) => {
      try {
        const contract =
          await service.bySlug(
            request.params
              .siteSlug
          );

        response.set(
          "Cache-Control",
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        );

        response.json(
          contract
        );
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports = {
  createPublicSiteReadRouter,
};
