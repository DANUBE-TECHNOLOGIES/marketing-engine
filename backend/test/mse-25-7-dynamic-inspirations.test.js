"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { AiContentService } = require("../src/modules/ai-content/service");

function content(id, overrides = {}) {
  return {
    id,
    slug: `article-${id}`,
    title: `Article ${id}`,
    excerpt: `Résumé ${id}`,
    body: {},
    seo: {},
    channel: "article",
    locale: "fr-FR",
    qualityScore: 90,
    publishedAt: new Date(`2026-08-0${id}T10:00:00.000Z`),
    ...overrides,
  };
}

function repository(items) {
  return {
    createJob: async () => null,
    listPublishedContents: async ({ ids = [], channel, limit }) => {
      let result = [...items];

      if (channel) {
        result = result.filter(item => item.channel === channel);
      }

      if (ids.length) {
        result = result.filter(item => ids.includes(String(item.id)));
      }

      return result.slice(0, limit);
    },
  };
}

test("MSE-25.7 expose les contenus publiés sous forme d'inspirations publiques", async () => {
  const service = new AiContentService(
    repository([
      content("1", {
        body: {
          category: "Conseils",
          hero: { imageUrl: "https://cdn.example.test/maurice.jpg" },
        },
      }),
    ]),
    "tenant_mondescale"
  );

  const result = await service.listPublished({
    channel: "article",
    limit: 6,
  });

  assert.equal(result.count, 1);
  assert.deepEqual(result.items[0], {
    id: "1",
    slug: "article-1",
    title: "Article 1",
    description: "Résumé 1",
    category: "Conseils",
    image: "https://cdn.example.test/maurice.jpg",
    channel: "article",
    locale: "fr-FR",
    qualityScore: 90,
    publishedAt: new Date("2026-08-01T10:00:00.000Z"),
  });
});

test("MSE-25.7 respecte l'ordre des contentIds sélectionnés dans le Designer", async () => {
  const service = new AiContentService(
    repository([
      content("1"),
      content("2"),
      content("3"),
    ]),
    "tenant_mondescale"
  );

  const result = await service.listPublished({
    ids: "3,1",
    channel: "article",
    limit: 6,
  });

  assert.deepEqual(
    result.items.map(item => item.id),
    ["3", "1"]
  );
});
