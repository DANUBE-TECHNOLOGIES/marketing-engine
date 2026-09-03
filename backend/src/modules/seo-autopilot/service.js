"use strict";

const { normalizePolicy, decideActionMode } = require("./policy");

function serializeError(error) {
  return { message: error?.message || "Erreur inconnue", code: error?.code || null, stack: error?.stack || null };
}

class SeoAutopilotService {
  constructor(repository, executor, { clock = () => new Date() } = {}) {
    this.repository = repository;
    this.executor = executor;
    this.clock = clock;
  }

  async health() {
    return { ok: true, version: "1.0.0", capability: "seo-autopilot", modes: ["simulation", "approval", "automatic"] };
  }

  async createRun({ siteId, plan, policy: rawPolicy, createdBy = null }) {
    if (!siteId) { const e = new Error("siteId requis"); e.status = 400; throw e; }
    if (!plan || !Array.isArray(plan.actions)) { const e = new Error("plan.actions requis"); e.status = 400; throw e; }
    const policy = normalizePolicy(rawPolicy);
    const sourceActions = plan.actions.slice(0, policy.maxActions);
    const run = await this.repository.createRun({
      siteId,
      status: "planned",
      mode: policy.mode,
      policy,
      sourcePlan: plan,
      createdBy,
      totalActions: sourceActions.length,
    });
    await this.repository.createActions(run.id, sourceActions.map((action, index) => ({
      order: action.order || index + 1,
      type: action.type,
      title: action.title || action.type,
      priority: action.priority || "medium",
      executionMode: decideActionMode(action, policy),
      status: "planned",
      recommendationId: action.recommendationId || null,
      targetPageId: action.targetPageId || null,
      destinationSlug: action.destinationSlug || null,
      payload: action,
    })));
    await this.repository.createAuditEvent({ runId: run.id, level: "info", eventType: "run_created", message: "Exécution Autopilot créée", data: { policy, totalActions: sourceActions.length } });
    return this.repository.getRun(run.id);
  }

  async executeRun(id, context = {}) {
    const run = await this.repository.getRun(id);
    if (!run) { const e = new Error("Exécution Autopilot introuvable"); e.status = 404; throw e; }
    if (["running", "completed"].includes(run.status)) { const e = new Error(`Exécution impossible depuis le statut ${run.status}`); e.status = 409; throw e; }
    const startedAt = this.clock();
    await this.repository.updateRun(id, { status: "running", startedAt });
    let succeeded = 0, failed = 0, awaitingApproval = 0, simulated = 0, blocked = 0;

    for (const action of run.actions) {
      if (action.executionMode === "blocked") {
        blocked += 1;
        await this.repository.updateAction(action.id, { status: "blocked", finishedAt: this.clock() });
        continue;
      }
      if (action.executionMode === "approval") {
        awaitingApproval += 1;
        await this.repository.updateAction(action.id, { status: "awaiting_approval" });
        continue;
      }
      if (action.executionMode === "simulation") {
        simulated += 1;
        await this.repository.updateAction(action.id, { status: "simulated", startedAt: this.clock(), finishedAt: this.clock(), result: { simulated: true } });
        continue;
      }
      await this.repository.updateAction(action.id, { status: "running", startedAt: this.clock(), attempts: { increment: 1 } });
      try {
        const execution = await this.executor.execute(action.payload, { ...context, run, action });
        succeeded += 1;
        await this.repository.updateAction(action.id, { status: "completed", finishedAt: execution.finishedAt, durationMs: execution.durationMs, result: execution.result, error: null });
        await this.repository.createAuditEvent({ runId: id, actionId: action.id, level: "info", eventType: "action_completed", message: action.title, data: execution.result });
      } catch (error) {
        failed += 1;
        await this.repository.updateAction(action.id, { status: "failed", finishedAt: this.clock(), error: serializeError(error) });
        await this.repository.createAuditEvent({ runId: id, actionId: action.id, level: "error", eventType: "action_failed", message: action.title, data: serializeError(error) });
        if (run.policy?.stopOnError !== false) break;
      }
    }

    const finishedAt = this.clock();
    const status = failed ? "failed" : awaitingApproval ? "awaiting_approval" : "completed";
    await this.repository.updateRun(id, { status, finishedAt, succeededActions: succeeded, failedActions: failed, awaitingApprovalActions: awaitingApproval, simulatedActions: simulated, blockedActions: blocked });
    await this.repository.createAuditEvent({ runId: id, level: failed ? "error" : "info", eventType: "run_finished", message: `Exécution terminée avec le statut ${status}`, data: { succeeded, failed, awaitingApproval, simulated, blocked } });
    return this.repository.getRun(id);
  }

  getRun(id) { return this.repository.getRun(id); }
  listRuns(query) { return this.repository.listRuns(query); }
}

module.exports = { SeoAutopilotService, serializeError };
