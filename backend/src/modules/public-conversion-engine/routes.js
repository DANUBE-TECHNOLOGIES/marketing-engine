"use strict";

const express = require("express");
const { PublicConversionService } = require("./service");

function sendError(response, error) {
  const status = Number(error?.statusCode || 500);
  response.status(status >= 400 && status <= 599 ? status : 500).json({
    error: error?.code || "PUBLIC_CONVERSION_ERROR",
    message: status >= 500 ? "Service de conversion indisponible." : error?.message || "Requête invalide.",
  });
}

function routes({ prisma }) {
  const router = express.Router();
  const service = new PublicConversionService(prisma);

  router.get("/public/conversions/health", (request, response) => {
    response.json({
      ok: true,
      capability: "public-conversion-engine",
      version: "25.43.0",
      storage: "first-party",
      pii: false,
      writeMode: "append-only",
    });
  });

  router.post("/public/conversions/sites/:siteSlug/events", async (request, response) => {
    try {
      const result = await service.ingest({
        request,
        siteSlug: request.params.siteSlug,
        input: request.body || {},
      });
      response.set("Cache-Control", "no-store");
      response.status(202).json(result);
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/api/conversions/summary", async (request, response) => {
    try {
      const result = await service.summary({
        request,
        siteSlug: request.query.siteSlug,
        days: request.query.days,
      });
      response.set("Cache-Control", "private, no-store");
      response.json(result);
    } catch (error) {
      sendError(response, error);
    }
  });

  return router;
}

module.exports = { routes, sendError };
