"use strict";

const express = require("express");
const { tenantIdForRequest } = require("../minisite-structured-data/routes");
const { SEARCH_CONSOLE_OWNER_PERMISSION } = require("./provider");
const { runSearchConsolePreflight } = require("./preflight");
const { SearchConsoleSubmissionService } = require("./service");
const { SearchConsoleObservabilityService } = require("./observability");
const { SearchConsolePerformanceService } = require("./performance");
const { IndexationCoverageService } = require("./indexation-coverage");
const { PublicIndexabilityObserver } = require("./public-indexability-observer");
const { SeoOpportunityWorkQueueService } = require("./opportunity-work-queue");
const { resolveLocalSeoContext } = require("./local-seo-intent");

function sendError(response, error) {
  response.status(Number(error?.statusCode || error?.status || 500)).json({
    error: error?.code || "SEARCH_CONSOLE_SUBMISSION_ERROR",
    message: error?.message || "Erreur Search Console.",
    details: error?.details || {},
  });
}

function normalizeCoveragePagePrefix(value, fallback) {
  const raw = String(value || fallback || "").trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    const pathname = url.pathname === "/" ? "/" : `${url.pathname.replace(/\/+$/g, "")}/`;
    return `${url.protocol}//${url.host}${pathname}`;
  } catch (_error) {
    return raw;
  }
}

function coverageScope(request, submissionService) {
  const publicOrigin = String(submissionService.structuredDataService.publicOrigin || "https://agences.mondescale.com").replace(/\/+$/g, "");
  const rawPrefix = request.query?.pagePrefix || process.env.SEARCH_CONSOLE_PAGE_PREFIX || process.env.SEARCH_CONSOLE_PREFERRED_HOST || `${publicOrigin}/`;
  return {
    siteUrl: request.query?.siteUrl || process.env.SEARCH_CONSOLE_SITE_URL || process.env.SEARCH_CONSOLE_PROPERTY || "sc-domain:mondescale.com",
    pagePrefix: normalizeCoveragePagePrefix(rawPrefix, `${publicOrigin}/`),
    days: request.query?.days,
  };
}

function publicAuditLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 200;
  return Math.max(1, Math.min(500, parsed));
}

function routes({ prisma, service, provider } = {}) {
  const router = express.Router();
  const submissionService = service || new SearchConsoleSubmissionService({ prisma, provider });
  const observabilityService = new SearchConsoleObservabilityService({ prisma, structuredDataService: submissionService.structuredDataService, provider: submissionService.provider });
  const performanceService = new SearchConsolePerformanceService({ provider: submissionService.provider });
  const indexationCoverageService = new IndexationCoverageService({ structuredDataService: submissionService.structuredDataService, performanceService });
  const publicIndexabilityObserver = new PublicIndexabilityObserver({ timeoutMs: Number(process.env.PUBLIC_INDEXABILITY_TIMEOUT_MS || 5000), concurrency: Number(process.env.PUBLIC_INDEXABILITY_CONCURRENCY || 6) });
  const opportunityQueue = new SeoOpportunityWorkQueueService({ prisma });

  router.get("/search-console-submissions/health", (_request, response) => { const activeProvider = submissionService.provider; response.json({ ok: true, capability: "search-console-submission-journal", provider: activeProvider?.name || "unknown", providerConfigured: activeProvider?.isConfigured?.() === true, requestedEnabled: activeProvider?.requestedEnabled === true, disabledReason: activeProvider?.disabledReason || null, credentialMode: activeProvider?.credentialMode || null, requiredPermissionLevel: SEARCH_CONSOLE_OWNER_PERMISSION, explicitApprovalRequired: true, autoSubmit: false, readOnlySitemapObservability: true, readOnlySearchPerformance: true, readOnlyIndexationCoverage: true, readOnlyPublicHttpIndexability: true }); });
  router.get("/search-console-submissions/properties", async (request, response) => { try { await tenantIdForRequest(prisma, request); const properties = await submissionService.provider.listSites(); response.json({ provider: submissionService.provider?.name || "unknown", count: properties.length, requiredPermissionLevel: SEARCH_CONSOLE_OWNER_PERMISSION, properties: properties.map((property) => ({ siteUrl: property?.siteUrl || null, permissionLevel: property?.permissionLevel || null, eligibleForSitemapSubmission: property?.permissionLevel === SEARCH_CONSOLE_OWNER_PERMISSION })) }); } catch (error) { sendError(response, error); } });
  router.get("/search-console-submissions/candidates", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await submissionService.candidates({ tenantId })); } catch (error) { sendError(response, error); } });
  router.get("/search-console-submissions/indexation-coverage", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await indexationCoverageService.diagnoseNetwork({ tenantId, ...coverageScope(request, submissionService) })); } catch (error) { sendError(response, error); } });
  router.get("/search-console-submissions/public-indexability", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(prisma, request);
      const sitemap = await submissionService.structuredDataService.previewSitemap({ tenantId });
      const allUrls = (sitemap?.entries || []).map((entry) => entry?.url).filter(Boolean);
      const limit = publicAuditLimit(request.query?.limit);
      const selectedUrls = allUrls.slice(0, limit);
      const audit = await publicIndexabilityObserver.audit({ urls: selectedUrls, publicOrigin: submissionService.structuredDataService.publicOrigin });
      response.json({ ...audit, sitemapUrlCount: allUrls.length, auditedUrlCount: selectedUrls.length, truncated: allUrls.length > selectedUrls.length, invariants: { readOnlyHttp: true, googleSubmission: false, pageCreation: false, publicationMutation: false, websiteDesignerMutation: false } });
    } catch (error) { sendError(response, error); }
  });
  router.get("/search-console-submissions/sites/:siteSlug/status", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await observabilityService.sitemapStatus({ tenantId, siteSlug: request.params.siteSlug, siteUrl: request.query?.siteUrl })); } catch (error) { sendError(response, error); } });
  router.get("/search-console-submissions/sites/:siteSlug/indexation-coverage", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await indexationCoverageService.diagnose({ tenantId, siteSlug: request.params.siteSlug, ...coverageScope(request, submissionService) })); } catch (error) { sendError(response, error); } });
  router.get("/search-console-submissions/performance", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); const dimensions = String(request.query?.dimensions || "query").split(",").map((item) => item.trim()).filter(Boolean); const siteSlug = String(request.query?.siteSlug || "").trim(); const localContext = siteSlug ? await resolveLocalSeoContext(prisma, tenantId, siteSlug) : null; response.json(await performanceService.query({ siteUrl: request.query?.siteUrl, pagePrefix: request.query?.pagePrefix, days: request.query?.days, dimensions, rowLimit: request.query?.rowLimit, localContext })); } catch (error) { sendError(response, error); } });

  router.get("/seo-opportunity-work-queue", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await opportunityQueue.list({ tenantId, status: request.query?.status, limit: request.query?.limit })); } catch (error) { sendError(response, error); } });
  router.post("/seo-opportunity-work-queue", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); const siteSlug = String(request.body?.siteSlug || "").trim(); const site = siteSlug ? await submissionService.structuredDataService.repository.findSiteBySlug(siteSlug, tenantId) : null; if (!site) throw Object.assign(new Error("Mini-site SEO introuvable."), { code: "SEO_OPPORTUNITY_SITE_NOT_FOUND", statusCode: 404 }); response.status(201).json(await opportunityQueue.create({ tenantId, siteId: String(site.id), siteSlug, opportunity: request.body?.opportunity, createdBy: request.body?.createdBy || request.user?.id || null })); } catch (error) { sendError(response, error); } });
  router.post("/seo-opportunity-work-queue/:runId/status", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await opportunityQueue.transition({ tenantId, runId: request.params.runId, status: request.body?.status, actor: request.body?.actor || request.user?.id || null, measurement: request.body?.measurement })); } catch (error) { sendError(response, error); } });

  router.get("/search-console-submissions", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await submissionService.list({ tenantId, status: request.query?.status, limit: request.query?.limit })); } catch (error) { sendError(response, error); } });
  router.post("/search-console-submissions/preflight", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await runSearchConsolePreflight({ tenantId, siteSlug: request.body?.siteSlug, siteUrl: request.body?.siteUrl, structuredDataService: submissionService.structuredDataService, provider: submissionService.provider })); } catch (error) { sendError(response, error); } });
  router.post("/search-console-submissions/prepare", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); const result = await submissionService.prepare({ tenantId, siteSlug: request.body?.siteSlug, siteUrl: request.body?.siteUrl, sitemapUrl: request.body?.sitemapUrl, requestedBy: request.body?.requestedBy || request.user?.id || null }); response.status(201).json(result); } catch (error) { sendError(response, error); } });
  router.post("/search-console-submissions/:runId/approve", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await submissionService.approve({ tenantId, runId: request.params.runId, approvedBy: request.body?.approvedBy || request.user?.id || null })); } catch (error) { sendError(response, error); } });
  router.post("/search-console-submissions/:runId/submit", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); response.json(await submissionService.submit({ tenantId, runId: request.params.runId })); } catch (error) { sendError(response, error); } });
  router.get("/search-console-submissions/:runId", async (request, response) => { try { const tenantId = await tenantIdForRequest(prisma, request); const result = await submissionService.get({ tenantId, runId: request.params.runId }); if (!result) return response.status(404).json({ error: "SEARCH_CONSOLE_SUBMISSION_NOT_FOUND" }); response.json(result); } catch (error) { sendError(response, error); } });
  return router;
}

module.exports = { coverageScope, normalizeCoveragePagePrefix, publicAuditLimit, routes, sendError };
