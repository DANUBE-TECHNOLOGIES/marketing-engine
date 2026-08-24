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

function createSiteRateGuard({ limit = 300, windowMs = 60000 } = {}) {
  const counters = new Map();
  return function siteRateGuard(request, response, next) {
    const now = Date.now();
    const siteSlug = String(request.params?.siteSlug || "unknown").slice(0, 120);
    const bucket = Math.floor(now / windowMs);
    const key = `${siteSlug}:${bucket}`;
    const count = Number(counters.get(key) || 0) + 1;
    counters.set(key, count);

    if (counters.size > 1000) {
      for (const candidate of counters.keys()) {
        if (!candidate.endsWith(`:${bucket}`)) counters.delete(candidate);
      }
    }

    if (count > limit) {
      response.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      return response.status(429).json({
        error: "PUBLIC_CONVERSION_RATE_LIMITED",
        message: "Trop d’événements de conversion pour ce mini-site.",
      });
    }
    return next();
  };
}

function routes({ prisma }) {
  const router = express.Router();
  const service = new PublicConversionService(prisma);
  const publicRateGuard = createSiteRateGuard();

  router.get("/public/conversions/health", (request, response) => {
    response.json({
      ok: true,
      capability: "public-conversion-engine",
      version: "25.45.0",
      storage: "first-party",
      pii: false,
      writeMode: "append-only",
      optimizationMode: "read-only-recommendations",
      publicRateLimit: "300/site/minute",
    });
  });

  router.post("/public/conversions/sites/:siteSlug/events", publicRateGuard, async (request, response) => {
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

module.exports = { createSiteRateGuard, routes, sendError };
