"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { AiContentService } = require("../src/modules/ai-content/service");

function provider(output) {
  return { name: "test-provider", generate: async () => output };
}

function baseOutput(overrides = {}) {
  return {
    title: "Titre éditorial",
    excerpt: "Une introduction éditoriale suffisamment claire pour présenter le sujet aux voyageurs et leur donner envie de préparer leur projet avec une agence Mondescale Voyages.",
    body: {
      introduction: Array(50).fill("introduction").join(" "),
      sections: Array.from({ length: 5 }, (_, i) => ({ heading: `Section ${i + 1}`, content: Array(170).fill("voyage").join(" ") })),
      faq: Array.from({ length: 3 }, (_, i) => ({ question: `Question ${i + 1} ?`, answer: "Réponse utile et vérifiable pour préparer le voyage." })),
    },
    ...overrides,
  };
}

function publicationRepo(content) {
  let current = { ...content };
  return {
    createJob: async () => null,
    getContent: async id => id === current.id ? current : null,
    publishContent: async id => { current = { ...current, status: "published", publishedAt: new Date() }; return current; },
    unpublishContent: async id => { current = { ...current, status: "review", publishedAt: null }; return current; },
  };
}

test("MSE-25.114 article title stays <=65 chars without ellipsis and falls back to topic", async () => {
  const service = new AiContentService(publicationRepo({ id: "unused" }), null, {
    provider: provider(baseOutput({ title: "Un titre beaucoup trop long qui dépasse volontairement la limite éditoriale prévue pour les articles publiables…" })),
  });
  const result = await service.preview({ channel: "article", topic: "Soleil en hiver : où partir pour retrouver la chaleur ?" });
  assert.ok(result.title.length <= 65);
  assert.equal(result.title.endsWith("…"), false);
  assert.equal(result.title, "Soleil en hiver : où partir pour retrouver la chaleur ?");
  assert.equal(result.seo.title, result.title);
  assert.equal(result.seo.openGraph.title, result.title);
});

test("MSE-25.114 editorial quality rewards a publishable 900-word article", async () => {
  const service = new AiContentService(publicationRepo({ id: "unused" }), null, { provider: provider(baseOutput()) });
  const result = await service.preview({ channel: "article", topic: "Voyage en famille" });
  assert.ok(result.qualityScore >= 90);
  assert.equal(result.seo.description, result.excerpt);
  assert.equal(result.seo.openGraph.description, result.excerpt);
});

test("MSE-25.115 publication blocks agency targeting without SEO owner", async () => {
  const content = {
    id: "content-guard",
    status: "review",
    seo: { editorialTargeting: { scope: "agencies", agencyIds: ["1", "2"], indexAgencyId: null } },
  };
  const service = new AiContentService(publicationRepo(content), null, { provider: provider(baseOutput()) });
  await assert.rejects(() => service.publishContent(content.id), error => error.code === "EDITORIAL_INDEX_OWNER_REQUIRED");
});

test("MSE-25.115 publication and unpublication preserve the review workflow", async () => {
  const content = {
    id: "content-publish",
    status: "review",
    seo: { editorialTargeting: { scope: "agencies", agencyIds: ["1", "2"], indexAgencyId: "1" } },
  };
  const service = new AiContentService(publicationRepo(content), null, { provider: provider(baseOutput()) });
  const published = await service.publishContent(content.id);
  assert.equal(published.status, "published");
  assert.ok(published.publishedAt instanceof Date);
  const review = await service.unpublishContent(content.id);
  assert.equal(review.status, "review");
  assert.equal(review.publishedAt, null);
});
