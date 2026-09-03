"use strict";

const ContentGenerationRepository = require("./repository");
const { validateCreateJob } = require("./validation");
const { AiSeoGeneratorService } = require("../ai-seo-generator/service");

function httpError(message, statusCode, code) {
  return Object.assign(new Error(message), { statusCode, code });
}

class ContentGenerationService {
  constructor(prismaOrRepo, tenantId, { executor } = {}) {
    this.repo = prismaOrRepo?.getCampaign ? prismaOrRepo : new ContentGenerationRepository(prismaOrRepo, tenantId);
    this.generator = new AiSeoGeneratorService();
    this.executor = executor || (async (task, context) => this.generator.generate(task, context));
  }

  health() {
    return { ok: true, version: "16.2.0", capability: "content-generation-jobs", queue: "database", generator: this.generator.health() };
  }

  async list(filters = {}) {
    return this.repo.list(filters);
  }

  async get(id) {
    const job = await this.repo.get(id);
    if (!job) throw httpError("Job de génération introuvable.", 404, "GENERATION_JOB_NOT_FOUND");
    return job;
  }

  async create(input) {
    const data = validateCreateJob(input);
    const campaign = await this.repo.getCampaign(data.campaignId);
    if (!campaign) throw httpError("Campagne introuvable.", 404, "CAMPAIGN_NOT_FOUND");
    if (!campaign.tasks?.length) throw httpError("La campagne ne contient aucune tâche. Lancez d'abord sa planification.", 409, "CAMPAIGN_HAS_NO_TASKS");
    const active = await this.repo.findActive(data.campaignId);
    if (active) return { ...active, reused: true };
    const job = await this.repo.create({
      campaignId: data.campaignId,
      priority: data.priority,
      requestedBy: data.requestedBy,
      options: data.options,
      status: "queued",
      progress: 0,
      totalTasks: campaign.tasks.length,
      completedTasks: 0,
      failedTasks: 0,
    });
    await this.repo.updateCampaign(campaign.id, { status: "planned", progress: 0 });
    return job;
  }

  async cancel(id) {
    const job = await this.get(id);
    if (["completed", "failed", "cancelled"].includes(job.status)) return job;
    return this.repo.update(id, { status: "cancelled", completedAt: new Date(), error: null });
  }

  async run(id) {
    let job = await this.get(id);
    if (job.status === "completed") return job;
    if (job.status === "cancelled") throw httpError("Ce job a été annulé.", 409, "GENERATION_JOB_CANCELLED");
    if (job.status === "running") throw httpError("Ce job est déjà en cours.", 409, "GENERATION_JOB_ALREADY_RUNNING");

    job = await this.repo.update(id, { status: "running", startedAt: new Date(), error: null });
    await this.repo.updateCampaign(job.campaignId, { status: "generating", progress: 0 });
    const tasks = job.campaign?.tasks || [];
    let completed = 0;
    let failed = 0;

    for (const task of tasks) {
      const fresh = await this.repo.get(id);
      if (fresh.status === "cancelled") return fresh;
      try {
        await this.repo.updateTask(task.id, { status: "running", startedAt: new Date(), error: null });
        const asset = await this.executor(task, { job: fresh, campaign: fresh.campaign });
        if (asset && this.repo.upsertAsset) await this.repo.upsertAsset(asset);
        completed += 1;
        await this.repo.updateTask(task.id, { status: "completed", progress: 100, completedAt: new Date() });
      } catch (error) {
        failed += 1;
        await this.repo.updateTask(task.id, { status: "failed", error: String(error.message || error), completedAt: new Date() });
      }
      const progress = tasks.length ? Math.round(((completed + failed) / tasks.length) * 100) : 100;
      await this.repo.update(id, { completedTasks: completed, failedTasks: failed, progress });
      await this.repo.updateCampaign(job.campaignId, { progress });
    }

    const status = failed ? "failed" : "completed";
    const error = failed ? `${failed} tâche(s) en échec.` : null;
    await this.repo.updateCampaign(job.campaignId, { status: failed ? "review" : "completed", progress: 100 });
    return this.repo.update(id, { status, progress: 100, completedTasks: completed, failedTasks: failed, error, completedAt: new Date() });
  }
}

module.exports = { ContentGenerationService };
