"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePolicy, decideActionMode } = require("../src/modules/seo-autopilot/policy");
const { SeoAutopilotExecutor } = require("../src/modules/seo-autopilot/executor");
const { SeoAutopilotService } = require("../src/modules/seo-autopilot/service");

function memoryRepository() {
  const runs = new Map(), actions = new Map(), events = [];
  let seq = 0;
  return {
    runs, actions, events,
    async createRun(data) { const row = { id: `r${++seq}`, ...data, actions: [], auditEvents: [] }; runs.set(row.id, row); return row; },
    async createActions(runId, rows) { for (const data of rows) { const row = { id: `a${++seq}`, runId, attempts: 0, ...data }; actions.set(row.id, row); } return { count: rows.length }; },
    async getRun(id) { const run = runs.get(id); if (!run) return null; return { ...run, actions: [...actions.values()].filter(a => a.runId === id).sort((a,b)=>a.order-b.order), auditEvents: events.filter(e => e.runId === id) }; },
    async updateRun(id, data) { Object.assign(runs.get(id), data); return runs.get(id); },
    async updateAction(id, data) { const row = actions.get(id); if (data.attempts?.increment) data = { ...data, attempts: row.attempts + data.attempts.increment }; Object.assign(row, data); return row; },
    async createAuditEvent(data) { const row = { id: `e${++seq}`, createdAt: new Date(), ...data }; events.push(row); return row; },
    async listRuns() { return [...runs.values()]; },
  };
}

const plan = { actions: [
  { order: 1, recommendationId: "rec1", type: "internal_linking", title: "Ajouter des liens", mode: "automatic" },
  { order: 2, recommendationId: "rec2", type: "content_generation", title: "Créer une page", mode: "manual_review" },
] };

test("normalise une politique sûre en simulation", () => {
  assert.equal(normalizePolicy({}).mode, "simulation");
  assert.equal(normalizePolicy({ maxActions: 500 }).maxActions, 50);
});

test("bloque les types explicitement refusés", () => {
  assert.equal(decideActionMode({ type: "publication", mode: "automatic" }, normalizePolicy({ mode: "automatic", deniedTypes: ["publication"] })), "blocked");
});

test("l'exécuteur appelle le handler correspondant", async () => {
  const executor = new SeoAutopilotExecutor({ handlers: { internal_linking: async (action) => ({ page: action.targetPageId || "p1" }) } });
  const result = await executor.execute({ type: "internal_linking" });
  assert.equal(result.result.page, "p1");
});

test("crée un run et ses actions", async () => {
  const repo = memoryRepository();
  const service = new SeoAutopilotService(repo, new SeoAutopilotExecutor());
  const run = await service.createRun({ siteId: "s1", plan, policy: { mode: "simulation" } });
  assert.equal(run.actions.length, 2);
  assert.ok(run.actions.every(a => a.executionMode === "simulation"));
});

test("exécute un run automatique et conserve l'approbation humaine", async () => {
  const repo = memoryRepository();
  const executor = new SeoAutopilotExecutor({ handlers: { internal_linking: async () => ({ linksAdded: 3 }) } });
  const service = new SeoAutopilotService(repo, executor);
  const created = await service.createRun({ siteId: "s1", plan, policy: { mode: "automatic" } });
  const result = await service.executeRun(created.id);
  assert.equal(result.status, "awaiting_approval");
  assert.equal(result.succeededActions, 1);
  assert.equal(result.awaitingApprovalActions, 1);
  assert.ok(result.auditEvents.some(e => e.eventType === "action_completed"));
});

test("le mode simulation n'appelle aucun handler", async () => {
  let called = 0;
  const repo = memoryRepository();
  const service = new SeoAutopilotService(repo, new SeoAutopilotExecutor({ handlers: { internal_linking: async () => { called++; } } }));
  const created = await service.createRun({ siteId: "s1", plan, policy: { mode: "simulation" } });
  const result = await service.executeRun(created.id);
  assert.equal(called, 0);
  assert.equal(result.simulatedActions, 2);
  assert.equal(result.status, "completed");
});

test("une erreur d'exécution fait échouer le run", async () => {
  const repo = memoryRepository();
  const service = new SeoAutopilotService(repo, new SeoAutopilotExecutor({ handlers: { internal_linking: async () => { throw new Error("boom"); } } }));
  const created = await service.createRun({ siteId: "s1", plan: { actions: [plan.actions[0]] }, policy: { mode: "automatic" } });
  const result = await service.executeRun(created.id);
  assert.equal(result.status, "failed");
  assert.equal(result.failedActions, 1);
  assert.match(result.actions[0].error.message, /boom/);
});
