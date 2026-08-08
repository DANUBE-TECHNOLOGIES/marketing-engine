"use strict";

const express =
  require("express");

const {
  MiniSiteStructuredDataService,
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
        "MINISITE_STRUCTURED_DATA_ERROR",

      message:
        error?.message ||
        "Erreur de génération des données structurées.",

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

  const structuredDataService =
    service ||
    new MiniSiteStructuredDataService({
      prisma,
    });

  router.get(
    "/minisite-structured-data/health",
    (
      _request,
      response
    ) => {
      response.json(
        structuredDataService
          .health()
      );
    }
  );

  router.get(
    "/minisite-structured-data/sitemap",
    async (
      _request,
      response
    ) => {
      try {
        const result =
          await structuredDataService
            .previewSitemap();

        response
          .set(
            "Cache-Control",
            "public, max-age=300, stale-while-revalidate=3600"
          )
          .json(
            result
          );
      } catch (error) {
        sendError(
          response,
          error
        );
      }
    }
  );

  router.get(
    "/minisite-structured-data/sites/:siteSlug",
    async (
      request,
      response
    ) => {
      try {
        const result =
          await structuredDataService
            .previewSite({
              siteSlug:
                request.params
                  .siteSlug,
            });

        response
          .set(
            "Cache-Control",
            "public, max-age=300, stale-while-revalidate=3600"
          )
          .json(
            result
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
    "/minisite-structured-data/network/preview",
    async (
      _request,
      response
    ) => {
      try {
        response.json(
          await structuredDataService
            .previewNetwork()
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
