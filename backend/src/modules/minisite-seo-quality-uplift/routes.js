"use strict";

const express = require("express");
const {
  MiniSiteSeoEnrichmentService,
} = require("../minisite-seo-enrichment/service");
const {
  scopedService,
} = require("../minisite-seo-enrichment/routes");
const {
  installQualityUpliftPreview,
} = require("../minisite-seo-enrichment/quality-uplift-preview-patch");

installQualityUpliftPreview(MiniSiteSeoEnrichmentService);

function sendError(response, error) {
  response.status(Number(error?.status || error?.statusCode || 500)).json({
    error: error?.code || "MSE_25_31_QUALITY_UPLIFT_ERROR",
    message: error?.message || "Erreur de preview MSE-25.31.",
    details: error?.details || {},
  });
}

function routes({ prisma, service } = {}) {
  const router = express.Router();

  router.get("/minisite-seo-quality-uplift/health", (request, response) => {
    response.json({
      status: "ok",
      capability: "mse-25.31-local-seo-quality-uplift",
      version: "mse-25.31",
      readOnly: true,
      writes: false,
      operations: ["previewAgency", "previewNetwork"],
    });
  });

  router.post(
    "/minisite-seo-quality-uplift/agencies/:agencyId/preview",
    async (request, response) => {
      try {
        response.json(
          await scopedService({ prisma, request, service }).previewAgencyQualityUplift({
            agencyId: request.params.agencyId,
            minimumWords: request.body?.minimumWords,
          })
        );
      } catch (error) {
        sendError(response, error);
      }
    }
  );

  router.post(
    "/minisite-seo-quality-uplift/network/preview",
    async (request, response) => {
      try {
        response.json(
          await scopedService({ prisma, request, service }).previewNetworkQualityUplift({
            minimumWords: request.body?.minimumWords,
          })
        );
      } catch (error) {
        sendError(response, error);
      }
    }
  );

  return router;
}

module.exports = {
  routes,
  sendError,
};
