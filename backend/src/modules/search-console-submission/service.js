"use strict";

const { SeoAutopilotRepository } = require("../seo-autopilot/repository");
const { MiniSiteStructuredDataService } = require("../minisite-structured-data/service");
const {
  DisabledSearchConsoleProvider,
  validateSearchConsoleSubmissionTarget,
} = require("./provider");

const ACTION_TYPE = "search-console-sitemap-submit";
const MODE = "search-console-manual";

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/g, "");
}

function siteSitemapPublicUrl(publicOrigin, siteSlug) {
  const origin = normalizeOrigin(publicOrigin);
  const slug = String(siteSlug || "").trim();
  if (!origin || !slug) return null;
  return `${origin}/agence/${encodeURIComponent(slug)}/sitemap.xml`;
}

class SearchConsoleSubmissionService {
  constructor({ prisma, structuredDataService, provider } = {}) {
    if (!prisma) throw new Error("Prisma est requis");
    this.prisma = prisma;
    this.structuredDataService = structuredDataService || new MiniSiteStructuredDataService({ prisma });
    this.provider = provider || new DisabledSearchConsoleProvider();
  }

  repository(tenantId) {
    return new SeoAutopilotRepository(this.prisma, tenantId);
  }

  async prepare({ tenantId, siteSlug, siteUrl, sitemapUrl, requestedBy } = {}) {
    const expectedSitemapUrl = siteSitemapPublicUrl(this.structuredDataService.publicOrigin, siteSlug);
    const suppliedSitemapUrl = String(sitemapUrl || "").trim();
    if (suppliedSitemapUrl && suppliedSitemapUrl !== expectedSitemapUrl) {
      const error = new Error("L’URL du sitemap doit correspondre au sitemap public généré par Local Engine.");
      error.code = "SEARCH_CONSOLE_SITEMAP_URL_MISMATCH";
      error.statusCode = 409;
      error.details = {
        suppliedSitemapUrl,
        expectedSitemapUrl,
      };
      throw error;
    }

    const target = validateSearchConsoleSubmissionTarget({
      siteUrl,
      sitemapUrl: expectedSitemapUrl,
    });
    const candidate = await this.structuredDataService.siteSitemapCandidate({ tenantId, siteSlug });

    if (!candidate.readyToSubmit) {
      const error = new Error("Le mini-site n’est pas prêt pour une soumission Search Console.");
      error.code = "SEARCH_CONSOLE_INDEXATION_NOT_READY";
      error.statusCode = 409;
      error.details = candidate.readiness;
      throw error;
    }

    const site = await this.structuredDataService.repository.findSiteBySlug(siteSlug, tenantId);
    const repository = this.repository(tenantId);
    const run = await repository.createRun({
      siteId: String(site.id),
      status: "awaiting_approval",
      mode: MODE,
      policy: {
        provider: "google-search-console",
        requiresExplicitApproval: true,
        autoSubmit: false,
        sitemapUrlBoundToGeneratedPublicRoute: true,
      },
      sourcePlan: {
        siteSlug,
        siteUrl: target.siteUrl,
        sitemapUrl: target.sitemapUrl,
        readiness: candidate.readiness,
        entryCount: candidate.entryCount,
      },
      createdBy: requestedBy || null,
      totalActions: 1,
      awaitingApprovalActions: 1,
    });

    await repository.createActions(run.id, [{
      order: 1,
      type: ACTION_TYPE,
      title: `Soumettre le sitemap Search Console de ${siteSlug}`,
      priority: "high",
      executionMode: "approval-required",
      status: "awaiting_approval",
      payload: {
        siteSlug,
        siteUrl: target.siteUrl,
        sitemapUrl: target.sitemapUrl,
        entryCount: candidate.entryCount,
      },
    }]);

    await repository.createAuditEvent({
      runId: run.id,
      level: "info",
      eventType: "search-console-submission-prepared",
      message: "Soumission Search Console préparée, en attente d’approbation explicite.",
      data: { siteSlug, ...target, entryCount: candidate.entryCount },
    });

    return repository.getRun(run.id);
  }

  async approve({ tenantId, runId, approvedBy } = {}) {
    const actor = String(approvedBy || "").trim();
    if (!actor) {
      const error = new Error("L’auteur de l’approbation est obligatoire.");
      error.code = "SEARCH_CONSOLE_APPROVER_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const repository = this.repository(tenantId);
    const run = await repository.getRun(runId);
    if (!run || run.mode !== MODE) {
      const error = new Error("Soumission Search Console introuvable.");
      error.code = "SEARCH_CONSOLE_SUBMISSION_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const action = (run.actions || []).find((item) => item.type === ACTION_TYPE);
    if (!action) throw Object.assign(new Error("Action Search Console introuvable."), { statusCode: 404 });
    if (action.status === "succeeded") return run;

    await repository.updateAction(action.id, {
      status: "approved",
      result: { approvedBy: actor, approvedAt: new Date().toISOString() },
    });
    await repository.updateRun(run.id, { status: "approved", awaitingApprovalActions: 0 });
    await repository.createAuditEvent({
      runId: run.id,
      actionId: action.id,
      level: "info",
      eventType: "search-console-submission-approved",
      message: "Soumission Search Console approuvée explicitement.",
      data: { approvedBy: actor },
    });
    return repository.getRun(run.id);
  }

  async submit({ tenantId, runId } = {}) {
    const repository = this.repository(tenantId);
    const run = await repository.getRun(runId);
    if (!run || run.mode !== MODE) {
      throw Object.assign(new Error("Soumission Search Console introuvable."), { code: "SEARCH_CONSOLE_SUBMISSION_NOT_FOUND", statusCode: 404 });
    }
    const action = (run.actions || []).find((item) => item.type === ACTION_TYPE);
    if (!action || action.status !== "approved") {
      throw Object.assign(new Error("La soumission doit être approuvée avant envoi."), { code: "SEARCH_CONSOLE_SUBMISSION_NOT_APPROVED", statusCode: 409 });
    }

    if (!this.provider.isConfigured()) {
      await repository.createAuditEvent({
        runId: run.id,
        actionId: action.id,
        level: "warning",
        eventType: "search-console-provider-not-configured",
        message: "Envoi bloqué : provider Search Console non configuré.",
      });
      return this.provider.submitSitemap(action.payload);
    }

    await repository.updateRun(run.id, { status: "running", startedAt: new Date() });
    await repository.updateAction(action.id, { status: "running", startedAt: new Date(), attempts: { increment: 1 } });

    try {
      const result = await this.provider.submitSitemap(action.payload);
      await repository.updateAction(action.id, { status: "succeeded", result: result || {}, finishedAt: new Date() });
      await repository.updateRun(run.id, { status: "succeeded", succeededActions: 1, finishedAt: new Date() });
      await repository.createAuditEvent({ runId: run.id, actionId: action.id, eventType: "search-console-submission-succeeded", message: "Sitemap soumis à Search Console.", data: result || {} });
      return repository.getRun(run.id);
    } catch (error) {
      await repository.updateAction(action.id, { status: "failed", error: { code: error.code || "SEARCH_CONSOLE_SUBMISSION_FAILED", message: error.message }, finishedAt: new Date() });
      await repository.updateRun(run.id, { status: "failed", failedActions: 1, finishedAt: new Date() });
      await repository.createAuditEvent({ runId: run.id, actionId: action.id, level: "error", eventType: "search-console-submission-failed", message: error.message, data: { code: error.code || null } });
      throw error;
    }
  }

  async get({ tenantId, runId } = {}) {
    return this.repository(tenantId).getRun(runId);
  }
}

module.exports = {
  SearchConsoleSubmissionService,
  ACTION_TYPE,
  MODE,
  normalizeOrigin,
  siteSitemapPublicUrl,
};