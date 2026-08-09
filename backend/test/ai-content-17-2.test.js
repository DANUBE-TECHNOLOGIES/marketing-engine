"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { AiContentService } = require("../src/modules/ai-content/service");
const { DeterministicProvider } = require("../src/modules/ai-content/providers");

function repo() {
  const jobs = new Map(); let seq = 0; let revision = 0;
  const published = [
    {
      id: "content-1",
      slug: "sicile-en-famille",
      status: "published",
      channel: "article",
      locale: "fr-FR",
      title: "La Sicile en famille",
      excerpt: "Nos conseils pour préparer un séjour en Sicile.",
      body: { category: "Destination", hero: { imageUrl: "https://example.test/sicile.jpg" } },
      seo: {},
      qualityScore: 88,
      publishedAt: new Date("2026-08-01T10:00:00Z"),
    },
    {
      id: "content-2",
      slug: "autotour-usa",
      status: "published",
      channel: "article",
      locale: "fr-FR",
      title: "Préparer un autotour aux États-Unis",
      excerpt: "Les étapes utiles avant de prendre la route.",
      body: { theme: "Autotour" },
      seo: {},
      qualityScore: 91,
      publishedAt: new Date("2026-08-02T10:00:00Z"),
    },
  ];

  return {
    getCampaign: async id => id === "cmp-1" ? { id, name: "Maurice hiver", agencies: [], destinations: [] } : null,
    getPrompt: async id => id === "prompt-1" ? { id } : null,
    createJob: async data => { const v = { id: `job-${++seq}`, attempts: 0, maxAttempts: 3, ...data }; jobs.set(v.id, v); return v; },
    updateJob: async (id, data) => { const v = { ...jobs.get(id), ...data }; jobs.set(id, v); return v; },
    getJob: async id => jobs.get(id) || null,
    listJobs: async () => [...jobs.values()],
    listPublishedContents: async ({ ids = [], channel, limit = 24 }) => published
      .filter(item => !channel || item.channel === channel)
      .filter(item => !ids.length || ids.includes(item.id))
      .slice(0, Math.max(limit, ids.length)),
    nextRevision: async () => ++revision,
    createContent: async data => ({ id: `content-${revision}`, ...data }),
    createCampaignAsset: async data => data.campaignId ? ({ id: "asset-1", ...data }) : null,
  };
}

test("health expose le fournisseur et les capacités 17.2", () => {
  const result = new AiContentService(repo(), null, { provider: new DeterministicProvider() }).health();
  assert.equal(result.version, "17.2.0");
  assert.equal(result.provider, "deterministic");
  assert.ok(result.features.includes("retry"));
  assert.ok(result.features.includes("published-catalog"));
});

test("generate crée aussi un CampaignAsset pour une campagne", async () => {
  const result = await new AiContentService(repo(), null, { provider: new DeterministicProvider() }).generate({ campaignId: "cmp-1", channel: "article", topic: "Maurice" });
  assert.equal(result.job.status, "completed");
  assert.equal(result.asset.status, "review");
  assert.equal(result.asset.payload.seoContentId, result.content.id);
  assert.equal(result.job.attempts, 1);
});

test("retry relance un job terminé et crée une nouvelle révision", async () => {
  const service = new AiContentService(repo(), null, { provider: new DeterministicProvider() });
  const first = await service.generate({ campaignId: "cmp-1", channel: "article", topic: "Seychelles" });
  const second = await service.retry(first.job.id);
  assert.equal(second.job.attempts, 2);
  assert.equal(second.content.revision, 2);
});

test("prompt inconnu est refusé", async () => {
  const service = new AiContentService(repo(), null, { provider: new DeterministicProvider() });
  await assert.rejects(() => service.generate({ promptId: "absent", channel: "article", topic: "Maldives" }), e => e.code === "AI_CONTENT_PROMPT_NOT_FOUND");
});

test("échec fournisseur marque le job failed", async () => {
  const failing = { name: "failing", generate: async () => { throw new Error("provider down"); } };
  const service = new AiContentService(repo(), null, { provider: failing });
  await assert.rejects(() => service.generate({ channel: "article", topic: "Dax" }), /provider down/);
  const jobs = await service.list({});
  assert.equal(jobs[0].status, "failed");
  assert.equal(jobs[0].attempts, 1);
});

test("catalogue publié normalise les articles pour InspirationsRenderer", async () => {
  const service = new AiContentService(repo(), null, { provider: new DeterministicProvider() });
  const result = await service.listPublished({ channel: "article", limit: 6 });

  assert.equal(result.count, 2);
  assert.equal(result.items[0].title, "La Sicile en famille");
  assert.equal(result.items[0].category, "Destination");
  assert.equal(result.items[0].image, "https://example.test/sicile.jpg");
  assert.equal(result.items[1].category, "Autotour");
});

test("sélection manuelle respecte l’ordre des contentIds", async () => {
  const service = new AiContentService(repo(), null, { provider: new DeterministicProvider() });
  const result = await service.listPublished({
    channel: "article",
    ids: "content-2,content-1",
    limit: 2,
  });

  assert.deepEqual(
    result.items.map(item => item.id),
    ["content-2", "content-1"]
  );
});
