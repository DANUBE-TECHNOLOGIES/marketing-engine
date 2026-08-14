"use strict";

const express = require("express");
const { tenantIdForRequest } = require("../minisite-structured-data/routes");
const { SearchConsoleSubmissionService } = require("./service");

function sendError(response, error) {
  response.status(Number(error?.statusCode || error?.status || 500)).json({
    error: error?.code || "SEARCH_CONSOLE_SUBMISSION_ERROR",
    message: error?.message || "Erreur Search Console.",
    details: error?.details || {},
  });
}

function routes({ prisma, service } = {}) {
  const router = express.Router();
  const submissionService = service || new SearchConsoleSubmissionService({ prisma });

  router.get("/search-console-submissions/health", (_request, response) => {
    response.json({
      ok: true,
      capability: "search-console-submission-journal",
      provider: submissionService.provider?.name || "unknown",
      providerConfigured: submissionService.provider?.isConfigured?.() === true,
      explicitApprovalRequired: true,
      autoSubmit: false,
    });
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