"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { AiContentService, slugify } = require("../src/modules/ai-content/service");

function repo() {
  const jobs = new Map(); let seq = 0;
  return {
    getCampaign: async id => id === "cmp-1" ? { id } : null,
    createJob: async data => { const v = { id: `job-${++seq}`, ...data }; jobs.set(v.id, v); return v; },
    updateJob: async (id, data) => { const v = { ...jobs.get(id), ...data }; jobs.set(id, v); return v; },
    getJob: async id => jobs.get(id) || null,
    listJobs: async () => [...jobs.values()],
    createContent: async data => ({ id: "content-1", ...data }),
  };
}

test("slugify normalise les accents", () => assert.equal(slugify("Île Maurice – Été 2026"), "ile-maurice-ete-2026"));
test("preview génère SEO, FAQ et schema.org", async () => {
  const output = await new AiContentService(repo()).preview({ channel: "landing-page", topic: "Île Maurice", agencyName: "Mondescale Bois-Colombes", city: "Bois-Colombes" });
  assert.match(output.title, /Île Maurice/); assert.equal(output.schemaOrg["@context"], "https://schema.org"); assert.ok(output.body.faq.length >= 2); assert.ok(output.qualityScore >= 80);
});
test("generate persiste un job et un contenu en review", async () => {
  const result = await new AiContentService(repo()).generate({ campaignId: "cmp-1", channel: "article", topic: "Seychelles" });
  assert.equal(result.job.status, "completed"); assert.equal(result.content.status, "review"); assert.equal(result.content.generationJobId, result.job.id);
});
test("une campagne inconnue est refusée", async () => {
  await assert.rejects(() => new AiContentService(repo()).generate({ campaignId: "absent", channel: "article", topic: "Maldives" }), e => e.code === "CAMPAIGN_NOT_FOUND");
});
test("un canal invalide est refusé", async () => {
  await assert.rejects(() => new AiContentService(repo()).preview({ channel: "sms", topic: "Dax" }), e => e.code === "INVALID_AI_CONTENT_CHANNEL");
});
