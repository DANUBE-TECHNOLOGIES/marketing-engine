"use strict";

const express = require("express");
const { tenantIdForRequest } = require("../minisite-structured-data/routes");
const { SEARCH_CONSOLE_OWNER_PERMISSION } = require("./provider");
const { runSearchConsolePreflight } = require("./preflight");
const { SearchConsoleSubmissionService } = require("./service");
const { SearchConsoleObservabilityService } = require("./observability");

function sendError(response, error) {
  response.status(Number(error?.statusCode || error?.status || 500)).json({
    error: error?.code || "SEARCH_CONSOLE_SUBMISSION_ERROR",
    message: error?.message || "Erreur Search Console.",
    details: error?.details || {},
  });
}

function routes({ prisma, service, provider } = {}) {
  const router = express.Router();
  const submissionService = service || new SearchConsoleSubmissionService({ prisma, provider });
  const observabilityService = new SearchConsoleObservabilityService({
    prisma,
    structuredDataService: submissionService.structuredDataService,
    provider: submissionService.provider,
  });

  router.get("/search-console-submissions/health", (_request, response) => {
    const activeProvider = submissionService.provider;
    response.json({
      ok: true,
      capability: "search-console-submission-journal",
      provider: activeProvider?.name || "unknown",
      providerConfigured: activeProvider?.isConfigured?.() === true,
      requestedEnabled: activeProvider?.requestedEnabled === true,
      disabledReason: activeProvider?.disabledReason || null,
      credentialMode: activeProvider?.credentialMode || null,
      requiredPermissionLevel: SEARCH_CONSOLE_OWNER_PERMISSION,
      explicitApprovalRequired: true,
      autoSubmit: false,
      readOnlySitemapObservability: true,
    });
  });

  router.get("/search-console-submissions/properties", async (request, response) => {
    try {
      await tenantIdForRequest(prisma, request);
      const properties = await submissionService.provider.listSites();
      response.json({
        provider: submissionService.provider?.name || "unknown",
        count: properties.length,
        requiredPermissionLevel: SEARCH_CONSOLE_OWNER_PERMISSION,
        properties: properties.map((property) => ({
          siteUrl: property?.siteUrl || null,
          permissionLevel: property?.permissionLevel || null,
          eligibleForSitemapSubmission:
            property?.permissionLevel === SEARCH_CONSOLE_OWNER_PERMISSION,
        })),
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/search-console-submissions/candidates", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      response.json(await submissionService.candidates({ tenantId }));
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/search-console-submissions/sites/:siteSlug/status", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      response.json(await observabilityService.sitemapStatus({
        tenantId,
        siteSlug: request.params.siteSlug,
        siteUrl: request.query?.siteUrl,
      }));
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/search-console-submissions", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      response.json(await submissionService.list({
        tenantId,
        status: request.query?.status,
        limit: request.query?.limit,
      }));
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post("/search-console-submissions/preflight", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      response.json(await runSearchConsolePreflight({
        tenantId,
        siteSlug: request.body?.siteSlug,
        siteUrl: request.body?.siteUrl,
        structuredDataService: submissionService.structuredDataService,
        provider: submissionService.provider,
      }));
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post("/search-console-submissions/prepare", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      const result = await submissionService.prepare({
        tenantId,
        siteSlug: request.body?.siteSlug,
        siteUrl: request.body?.siteUrl,
        sitemapUrl: request.body?.sitemapUrl,
        requestedBy: request.body?.requestedBy || request.user?.id || null,
      });
      response.status(201).json(result);
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post("/search-console-submissions/:runId/approve", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      response.json(await submissionService.approve({
        tenantId,
        runId: request.params.runId,
        approvedBy: request.body?.approvedBy || request.user?.id || null,
      }));
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post("/search-console-submissions/:runId/submit", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      response.json(await submissionService.submit({ tenantId, runId: request.params.runId }));
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/search-console-submissions/:runId", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      const result = await submissionService.get({ tenantId, runId: request.params.runId });
      if (!result) return response.status(404).json({ error: "SEARCH_CONSOLE_SUBMISSION_NOT_FOUND" });
      response.json(result);
    } catch (error) {
      sendError(response, error);
    }
  });

  return router;
}

module.exports = { routes, sendError };
