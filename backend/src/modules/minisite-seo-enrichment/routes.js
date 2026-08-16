"use strict";

const express = require("express");
const { MiniSiteSeoEnrichmentService } = require("./service");
const { installProjectedReadiness } = require("./projected-readiness-patch");
const { installEditorialHardening } = require("./editorial-hardening-patch");
const { installPublishedSiteScope } = require("./published-site-scope-patch");
const { installPlanFingerprintGuard } = require("./plan-fingerprint-patch");
const { installSummaryConsistency } = require("./summary-consistency-patch");
const PageBuilderPersistenceService = require("../page-builder-persistence/service");
const { MiniSiteStructuredDataService } = require("../minisite-structured-data/service");

installProjectedReadiness(MiniSiteSeoEnrichmentService);
installEditorialHardening(MiniSiteSeoEnrichmentService);
installPublishedSiteScope(MiniSiteSeoEnrichmentService);
installPlanFingerprintGuard(MiniSiteSeoEnrichmentService);
installSummaryConsistency(MiniSiteSeoEnrichmentService);

function sendError(response, error) {
  response.status(Number(error?.status || error?.statusCode || 500)).json({
    error: error?.code || "MINISITE_SEO_ENRICHMENT_ERROR",
    message: error?.message || "Erreur de planification SEO.",
    details: error?.details || {},
  });
}

function scopedService({ prisma, request, service } = {}) {
  if (service) return service;

  const tenantId = request?.tenantId || request?.tenant?.id || null;
  if (!tenantId) {
    const error = new Error("Le tenant résolu est obligatoire pour MSE-25.30.");
    error.code = "MINISITE_SEO_TENANT_REQUIRED";
    error.status = 400;
    throw error;
  }

  const structuredData = new MiniSiteStructuredDataService({ prisma });

  return new MiniSiteSeoEnrichmentService({
    prisma,
    pageBuilderPersistenceService: new PageBuilderPersistenceService({
      prisma,
      tenantId,
    }),
    structuredDataService: {
      previewSitemap: () => structuredData.previewSitemap({ tenantId }),
    },
  });
}

function routes({ prisma, service } = {}) {
  const router = express.Router();

  router.get("/minisite-seo-enrichment/health", (request, response) => {
    try {
      response.json(scopedService({ prisma, request, service }).health());
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post("/minisite-seo-enrichment/agencies/:agencyId/preview", async (request, response) => {
    try { response.json(await scopedService({ prisma, request, service }).previewAgency({ agencyId: request.params.agencyId })); } catch (error) { sendError(response, error); }
  });

  router.post("/minisite-seo-enrichment/agencies/:agencyId/apply", async (request, response) => {
    try {
      response.json(await scopedService({ prisma, request, service }).applyAgency({ agencyId: request.params.agencyId, dryRun: request.body?.dryRun !== false, confirm: request.body?.confirm === true }));
    } catch (error) { sendError(response, error); }
  });

  router.post("/minisite-seo-enrichment/agencies/:agencyId/optimize/preview", async (request, response) => {
    try { response.json(await scopedService({ prisma, request, service }).previewAgencyOptimization({ agencyId: request.params.agencyId })); } catch (error) { sendError(response, error); }
  });

  router.post("/minisite-seo-enrichment/agencies/:agencyId/optimize", async (request, response) => {
    try {
      response.json(await scopedService({ prisma, request, service }).optimizeAgency({ agencyId: request.params.agencyId, dryRun: request.body?.dryRun !== false, confirm: request.body?.confirm === true }));
    } catch (error) { sendError(response, error); }
  });

  router.post("/minisite-seo-enrichment/agencies/:agencyId/content-optimize/preview", async (request, response) => {
    try { response.json(await scopedService({ prisma, request, service }).previewAgencyContentOptimization({ agencyId: request.params.agencyId })); } catch (error) { sendError(response, error); }
  });

  router.post("/minisite-seo-enrichment/agencies/:agencyId/content-optimize", async (request, response) => {
    try {
      response.json(await scopedService({ prisma, request, service }).optimizeAgencyContent({
        agencyId: request.params.agencyId,
        dryRun: request.body?.dryRun !== false,
        confirm: request.body?.confirm === true,
        createdBy: request.body?.createdBy || "minisite-seo-optimizer",
      }));
    } catch (error) { sendError(response, error); }
  });

  router.post("/minisite-seo-enrichment/network/preview", async (request, response) => {
    try { response.json(await scopedService({ prisma, request, service }).previewNetwork()); } catch (error) { sendError(response, error); }
  });

  router.post("/minisite-seo-enrichment/network/content-optimize/preview", async (request, response) => {
    try {
      response.json(await scopedService({ prisma, request, service }).previewNetworkContentOptimization({
        similarityThreshold: request.body?.similarityThreshold,
        minimumWords: request.body?.minimumWords,
        qualityMinimumWords: request.body?.qualityMinimumWords,
      }));
    } catch (error) { sendError(response, error); }
  });

  router.post("/minisite-seo-enrichment/network/content-optimize", async (request, response) => {
    try {
      response.json(await scopedService({ prisma, request, service }).optimizeNetworkContent({
        dryRun: request.body?.dryRun !== false,
        confirm: request.body?.confirm === true,
        createdBy: request.body?.createdBy || "minisite-seo-network-rollout",
        similarityThreshold: request.body?.similarityThreshold,
        minimumWords: request.body?.minimumWords,
        qualityMinimumWords: request.body?.qualityMinimumWords,
        expectedPlanFingerprint: request.body?.expectedPlanFingerprint,
      }));
    } catch (error) { sendError(response, error); }
  });

  return router;
}

module.exports = { routes, sendError, scopedService };
