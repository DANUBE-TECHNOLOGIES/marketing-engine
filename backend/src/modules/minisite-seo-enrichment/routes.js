"use strict";

const express =
  require("express");

const {
  MiniSiteSeoEnrichmentService,
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
        "MINISITE_SEO_ENRICHMENT_ERROR",

      message:
        error?.message ||
        "Erreur de planification SEO.",

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

  const seoService =
    service ||
    new MiniSiteSeoEnrichmentService({
      prisma,
    });

  router.get(
    "/minisite-seo-enrichment/health",
    (
      _request,
      response
    ) => {
      response.json(
        seoService.health()
      );
    }
  );

  router.post(
    "/minisite-seo-enrichment/agencies/:agencyId/preview",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await seoService
            .previewAgency({
              agencyId:
                request.params
                  .agencyId,
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
    "/minisite-seo-enrichment/agencies/:agencyId/apply",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await seoService
            .applyAgency({
              agencyId:
                request.params
                  .agencyId,

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
    "/minisite-seo-enrichment/network/preview",
    async (
      _request,
      response
    ) => {
      try {
        response.json(
          await seoService
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
