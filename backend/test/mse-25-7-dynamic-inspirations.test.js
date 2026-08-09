"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { AiContentService } = require("../src/modules/ai-content/service");
const {
  hydratePublicInspirations,
} = require("../src/modules/public-site-read/inspiration-hydrator");

function content(id, overrides = {}) {
  return {
    id,
    tenantId: "tenant_mondescale",
    slug: `article-${id}`,
    title: `Article ${id}`,
    excerpt: `Résumé ${id}`,
    body: {},
    seo: {},
    channel: "article",
    locale: "fr-FR",
    status: "published",
    qualityScore: 90,
    publishedAt: new Date(`2026-08-0${id}T10:00:00.000Z`),
    updatedAt: new Date(`2026-08-0${id}T10:00:00.000Z`),
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

function prismaWithContents(items) {
  return {
    seoContent: {
      findMany: async ({ where, take }) => {
        let result = items.filter((item) =>
          item.tenantId === where.tenantId &&
          item.status === where.status &&
          item.channel === where.channel
        );

        if (where.id?.in?.length) {
          result = result.filter((item) =>
            where.id.in.includes(String(item.id))
          );
        } else {
          result = result.sort(
            (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
          );
        }

        return result.slice(0, take);
      },
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

test("MSE-25.7 hydrate automatiquement le bloc public avec les derniers articles publiés", async () => {
  const pages = [
    {
      id: "home",
      blocks: [
        {
          id: "insp-1",
          type: "inspirations",
          content: { title: "Inspirations" },
          settings: {
            __dataSource: "content-generation",
            selectionMode: "automatic",
            limit: "2",
          },
        },
      ],
    },
  ];

  const hydrated = await hydratePublicInspirations({
    prisma: prismaWithContents([
      content("1"),
      content("2"),
      content("3"),
    ]),
    tenantId: "tenant_mondescale",
    pages,
  });

  assert.deepEqual(
    hydrated[0].blocks[0].content.items.map((item) => item.id),
    ["3", "2"]
  );
  assert.deepEqual(
    hydrated[0].blocks[0].content.inspirations.map((item) => item.id),
    ["3", "2"]
  );
});

test("MSE-25.7 hydrate la sélection manuelle selon l'ordre contentIds du Designer", async () => {
  const pages = [
    {
      id: "home",
      blocks: [
        {
          id: "insp-1",
          type: "inspirations",
          content: {},
          settings: {
            __dataSource: "content-generation",
            selectionMode: "manual",
            contentIds: ["3", "1"],
            limit: "6",
          },
        },
      ],
    },
  ];

  const hydrated = await hydratePublicInspirations({
    prisma: prismaWithContents([
      content("1"),
      content("2"),
      content("3"),
    ]),
    tenantId: "tenant_mondescale",
    pages,
  });

  assert.deepEqual(
    hydrated[0].blocks[0].content.items.map((item) => item.id),
    ["3", "1"]
  );
});

test("MSE-25.7 ne remplace jamais les inspirations éditoriales manuelles", async () => {
  const manualItems = [
    {
      title: "Conseil local",
      description: "Contenu saisi à la main",
    },
  ];

  const pages = [
    {
      id: "home",
      blocks: [
        {
          id: "insp-manual",
          type: "inspirations",
          content: { items: manualItems },
          settings: { __dataSource: "manual" },
        },
      ],
    },
  ];

  const hydrated = await hydratePublicInspirations({
    prisma: prismaWithContents([content("1")]),
    tenantId: "tenant_mondescale",
    pages,
  });

  assert.deepEqual(
    hydrated[0].blocks[0].content.items,
    manualItems
  );
});
