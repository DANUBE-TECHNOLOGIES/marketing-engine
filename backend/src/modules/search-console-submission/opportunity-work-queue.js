"use strict";

const { SeoAutopilotRepository } = require("../seo-autopilot/repository");

const MODE = "seo-opportunity-work-queue";
const ACTION_TYPE = "seo-opportunity-work-item";
const ALLOWED_STATUSES = new Set(["planned", "succeeded", "measured"]);

function opportunityKey({ siteSlug, query, workKey } = {}) {
  const identity = String(workKey || query || "").trim().toLowerCase();
  return `${String(siteSlug || "").trim().toLowerCase()}::${identity}`;
}

class SeoOpportunityWorkQueueService {
  constructor({ prisma } = {}) {
    if (!prisma) throw new Error("Prisma est requis");
    this.prisma = prisma;
  }

  repository(tenantId) { return new SeoAutopilotRepository(this.prisma, tenantId); }

  async create({ tenantId, siteId, siteSlug, opportunity, createdBy } = {}) {
    const query = String(opportunity?.query || "").trim();
    const workKey = String(opportunity?.workKey || query || "").trim();
    const label = String(opportunity?.label || query || workKey || "").trim();
    if (!workKey || !siteId || !siteSlug) {
      throw Object.assign(new Error("Site et identifiant de travail SEO sont obligatoires."), { code: "SEO_OPPORTUNITY_INVALID", statusCode: 400 });
    }
    const repository = this.repository(tenantId);
    const existing = await repository.listRuns({ siteId: String(siteId), mode: MODE, limit: 200 });
    const key = opportunityKey({ siteSlug, query, workKey });
    const duplicate = existing.find((run) => run?.sourcePlan?.opportunityKey === key && !["measured", "cancelled"].includes(run.status));
    if (duplicate) return repository.getRun(duplicate.id);

    const normalizedOpportunity = { ...opportunity, query: query || null, workKey, label };
    const run = await repository.createRun({
      siteId: String(siteId), status: "pending", mode: MODE, createdBy: createdBy || null,
      policy: { humanValidationRequired: true, automaticContentMutation: false },
      sourcePlan: { opportunityKey: key, siteSlug, opportunity: normalizedOpportunity },
      totalActions: 1,
    });
    await repository.createActions(run.id, [{
      order: 1,
      type: ACTION_TYPE,
      title: opportunity?.action?.label || label || `Travailler ${workKey}`,
      priority: opportunity?.priority || "medium",
      executionMode: "manual",
      status: "pending",
      payload: {
        siteSlug,
        query: query || null,
        workKey,
        sourceType: opportunity?.sourceType || "search-console",
        label,
        score: opportunity?.score || 0,
        action: opportunity?.action || null,
        baseline: { clicks: opportunity?.clicks || 0, impressions: opportunity?.impressions || 0, ctr: opportunity?.ctr || 0, position: opportunity?.position || 0 },
      },
    }]);
    await repository.createAuditEvent({ runId: run.id, eventType: "seo-opportunity-created", message: "Opportunité SEO ajoutée à la file de travail.", data: { siteSlug, query: query || null, workKey, sourceType: opportunity?.sourceType || "search-console", score: opportunity?.score || 0 } });
    return repository.getRun(run.id);
  }

  async list({ tenantId, status, limit = 100 } = {}) {
    const runs = await this.repository(tenantId).listRuns({ mode: MODE, status: status || undefined, limit });
    return { count: runs.length, runs };
  }

  async transition({ tenantId, runId, status, actor, measurement } = {}) {
    const next = String(status || "").trim();
    if (!ALLOWED_STATUSES.has(next)) throw Object.assign(new Error("Transition SEO invalide."), { code: "SEO_OPPORTUNITY_STATUS_INVALID", statusCode: 400 });
    const repository = this.repository(tenantId);
    const run = await repository.getRun(runId);
    if (!run || run.mode !== MODE) throw Object.assign(new Error("Opportunité SEO introuvable."), { code: "SEO_OPPORTUNITY_NOT_FOUND", statusCode: 404 });
    const action = (run.actions || []).find((item) => item.type === ACTION_TYPE);
    const result = { ...(action?.result || {}), actor: actor || null, updatedAt: new Date().toISOString(), ...(next === "measured" ? { measurement: measurement || {} } : {}) };
    await repository.updateAction(action.id, { status: next === "planned" ? "approved" : next, result, ...(next === "succeeded" ? { finishedAt: new Date() } : {}) });
    await repository.updateRun(run.id, { status: next, ...(next === "succeeded" || next === "measured" ? { finishedAt: new Date() } : {}) });
    await repository.createAuditEvent({ runId: run.id, actionId: action.id, eventType: `seo-opportunity-${next}`, message: `Opportunité SEO passée au statut ${next}.`, data: { actor: actor || null, measurement: next === "measured" ? measurement || {} : undefined } });
    return repository.getRun(run.id);
  }
}

module.exports = { SeoOpportunityWorkQueueService, MODE, ACTION_TYPE, opportunityKey };
