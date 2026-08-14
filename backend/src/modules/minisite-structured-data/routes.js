"use strict";

const express = require("express");

const {
  MiniSiteStructuredDataService,
} = require("./service");

function sendError(response, error) {
  response.status(Number(error?.status || error?.statusCode || 500)).json({
    error: error?.code || "MINISITE_STRUCTURED_DATA_ERROR",
    message: error?.message || "Erreur de génération des données structurées.",
    details: error?.details || {},
  });
}

async function tenantIdForRequest(prisma, request) {
  const direct = String(
    request.tenantId ||
    request.get("x-tenant-id") ||
    ""
  ).trim();

  if (direct) return direct;

  const slug = String(
    request.tenantSlug ||
    request.get("x-tenant-slug") ||
    ""
  ).trim();

  if (!slug) {
    const error = new Error("Le tenant est obligatoire pour les données structurées.");
    error.code = "MINISITE_STRUCTURED_DATA_TENANT_REQUIRED";
    error.status = 400;
    throw error;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!tenant) {
    const error = new Error("Tenant introuvable.");
    error.code = "MINISITE_STRUCTURED_DATA_TENANT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  return tenant.id;
}

function routes({ prisma, service } = {}) {
  const router = express.Router();
  const structuredDataService = service || new MiniSiteStructuredDataService({ prisma });

  router.get("/minisite-structured-data/health", (_request, response) => {
    response.json(structuredDataService.health());
  });

  router.get("/minisite-structured-data/sitemap", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      const result = await structuredDataService.previewSitemap({ tenantId });
      response
        .set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
        .json(result);
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/minisite-structured-data/sitemap.xml", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      const result = await structuredDataService.networkSitemapXml({ tenantId });
      response
        .status(200)
        .set("Content-Type", "application/xml; charset=utf-8")
        .set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
        .send(result.xml);
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/minisite-structured-data/indexation/readiness", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      const result = await structuredDataService.previewSitemap({ tenantId });
      response.json(result.indexationReadiness || null);
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/minisite-structured-data/sites/:siteSlug/indexation", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      const result = await structuredDataService.siteSitemapCandidate({
        siteSlug: request.params.siteSlug,
        tenantId,
      });
      response.json({
        siteSlug: result.siteSlug,
        readyToSubmit: result.readyToSubmit,
        readiness: result.readiness,
        entryCount: result.entryCount,
        entries: result.entries,
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/minisite-structured-data/sites/:siteSlug/sitemap.xml", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      const result = await structuredDataService.siteSitemapCandidate({
        siteSlug: request.params.siteSlug,
        tenantId,
      });

      if (!result.readyToSubmit || !result.xml) {
        return response.status(409).json({
          error: "MINISITE_INDEXATION_NOT_READY",
          message: "Le mini-site n’est pas encore prêt pour soumission à l’indexation.",
          details: result.readiness,
        });
      }

      return response
        .status(200)
        .set("Content-Type", "application/xml; charset=utf-8")
        .set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
        .send(result.xml);
    } catch (error) {
      return sendError(response, error);
    }
  });

  router.get("/minisite-structured-data/sites/:siteSlug", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      const result = await structuredDataService.previewSite({
        siteSlug: request.params.siteSlug,
        tenantId,
      });
      response
        .set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
        .json(result);
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post("/minisite-structured-data/network/preview", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      response.json(await structuredDataService.previewNetwork({ tenantId }));
    } catch (error) {
      sendError(response, error);
    }
  });

  return router;
}

module.exports = {
  routes,
  sendError,
  tenantIdForRequest,
};
