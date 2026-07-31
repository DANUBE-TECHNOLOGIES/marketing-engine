"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { ContentGenerationService } = require("../src/modules/content-generation/service");
const { validateCreateJob } = require("../src/modules/content-generation/validation");

function repoFixture() {
  const campaign = { id: "c1", tasks: [{ id: "t1" }, { id: "t2" }] };
  let job;
  return {
    campaign,
    getCampaign: async id => id === "c1" ? campaign : null,
    findActive: async () => null,
    create: async data => (job = { id: "j1", ...data, campaign }),
    get: async id => id === "j1" ? job : null,
    list: async () => job ? [job] : [],
    update: async (id, data) => (job = { ...job, ...data, campaign }),
    updateCampaign: async (id, data) => Object.assign(campaign, data),
    updateTask: async (id, data) => Object.assign(campaign.tasks.find(t => t.id === id), data),
  };
}

test("valide un job de génération", () => {
  assert.deepEqual(validateCreateJob({ campaignId: "c1", priority: "high" }), { campaignId: "c1", priority: "high", requestedBy: null, options: {} });
});

test("refuse une priorité invalide", () => {
  assert.throws(() => validateCreateJob({ campaignId: "c1", priority: "now" }), /Priorité/);
});

test("crée un job tenant-scoped avec le nombre de tâches", async () => {
  const repo = repoFixture();
  const job = await new ContentGenerationService(repo).create({ campaignId: "c1" });
  assert.equal(job.status, "queued");
  assert.equal(job.totalTasks, 2);
  assert.equal(repo.campaign.status, "planned");
});

test("exécute les tâches et termine le job", async () => {
  const repo = repoFixture();
  const service = new ContentGenerationService(repo, null, { executor: async () => ({ ok: true }) });
  await service.create({ campaignId: "c1" });
  const job = await service.run("j1");
  assert.equal(job.status, "completed");
  assert.equal(job.progress, 100);
  assert.equal(job.completedTasks, 2);
  assert.equal(repo.campaign.status, "completed");
});

test("isole l'échec d'une tâche et place la campagne en review", async () => {
  const repo = repoFixture();
  const service = new ContentGenerationService(repo, null, { executor: async task => { if (task.id === "t2") throw new Error("boom"); } });
  await service.create({ campaignId: "c1" });
  const job = await service.run("j1");
  assert.equal(job.status, "failed");
  assert.equal(job.failedTasks, 1);
  assert.equal(repo.campaign.status, "review");
});
