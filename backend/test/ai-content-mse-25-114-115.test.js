"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { AiContentService } = require("../src/modules/ai-content/service");
const createAiContentRouter = require("../src/modules/ai-content/routes");

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

test("MSE-25.115 editorial PATCH keeps SEO, OpenGraph and schema metadata aligned", async () => {
  const original = {
    id: "content-edit",
    tenantId: "tenant-test",
    campaignId: null,
    status: "review",
    title: "Ancien titre",
    excerpt: "Ancien extrait",
    seo: {
      title: "Ancien titre SEO",
      description: "Ancienne description SEO",
      keywords: ["voyage"],
      editorialTargeting: { scope: "agencies", agencyIds: ["1", "2"], indexAgencyId: "1" },
      openGraph: {
        title: "Ancien titre OG",
        description: "Ancienne description OG",
        type: "article",
      },
    },
    schemaOrg: {
      "@context": "https://schema.org",
      "@type": "Article",
      name: "Ancien nom schema",
      description: "Ancienne description schema",
    },
  };

  let saved = null;
  const prisma = {
    seoContent: {
      findFirst: async ({ where }) => where.id === original.id && where.tenantId === original.tenantId ? original : null,
      update: async ({ where, data }) => {
        assert.equal(where.id, original.id);
        saved = { ...original, ...data };
        return saved;
      },
    },
  };

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.tenant = { id: original.tenantId }; next(); });
  app.use(createAiContentRouter({ prisma }));

  const server = await new Promise(resolve => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/ai-content/contents/${original.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Nouveau titre éditorial",
        excerpt: "Nouvel extrait éditorial pour la publication.",
      }),
    });

    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.title, "Nouveau titre éditorial");
    assert.equal(result.excerpt, "Nouvel extrait éditorial pour la publication.");
    assert.equal(saved.seo.title, result.title);
    assert.equal(saved.seo.description, result.excerpt);
    assert.equal(saved.seo.openGraph.title, result.title);
    assert.equal(saved.seo.openGraph.description, result.excerpt);
    assert.deepEqual(saved.seo.keywords, ["voyage"]);
    assert.deepEqual(saved.seo.editorialTargeting, original.seo.editorialTargeting);
    assert.equal(saved.schemaOrg.name, result.title);
    assert.equal(saved.schemaOrg.description, result.excerpt);
    assert.equal(saved.schemaOrg["@type"], "Article");
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
