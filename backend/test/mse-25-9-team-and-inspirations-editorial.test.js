"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const hydrator = require("../src/modules/public-site-read/dynamic-block-hydrator");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 exposes team and inspirations in the V2 block catalog", () => {
  const catalog = read("frontend/lib/page-builder-v2/block-catalog.js");

  assert.match(catalog, /type:\s*["']team["']/);
  assert.match(catalog, /source:\s*["']agency-team["']/);
  assert.match(catalog, /members:\s*\[\]/);
  assert.match(catalog, /type:\s*["']inspirations["']/);
  assert.match(catalog, /source:\s*["']content-generation["']/);
});

test("MSE-25.9 provides and wires a structured team member editor", () => {
  const editors = read("frontend/components/page-builder-v2/BlockListEditors.js");
  const designer = read("frontend/components/page-builder-v2/VisualPageBuilder.js");

  assert.match(editors, /export function TeamEditor/);
  assert.match(editors, /Ajouter un membre/);
  assert.match(editors, /label=["']Nom["']/);
  assert.match(editors, /label=["']Fonction["']/);
  assert.match(editors, /label=["']URL de la photo["']/);
  assert.match(editors, /label=["']Présentation["']/);

  assert.match(designer, /TeamEditor/);
  assert.match(designer, /block\.type === ["']team["']/);
  assert.match(designer, /members=\{content\.members\}/);
  assert.match(designer, /set\(["']members["'],\s*members\)/);
});

test("MSE-25.9 exposes automatic/manual source controls for destinations and inspirations", () => {
  const designer = read("frontend/components/page-builder-v2/VisualPageBuilder.js");

  assert.match(designer, /Source des destinations/);
  assert.match(designer, /Catalogue publié automatiquement/);
  assert.match(designer, /content\.selectionMode === ["']manual["']/);
  assert.match(designer, /Source des inspirations/);
  assert.match(designer, /Contenus publiés automatiquement/);
  assert.match(designer, /content\.source === ["']manual["']/);
  assert.match(designer, /contentIds/);
});

test("MSE-25.9 plans automatic editorial inspirations", () => {
  const plan = hydrator.collectInspirationPlan([
    {
      blocks: [
        {
          type: "inspirations",
          status: "published",
          content: {
            source: "content-generation",
            limit: 6,
          },
        },
      ],
    },
  ]);

  assert.equal(plan.automaticLimit, 6);
  assert.deepEqual(plan.references, []);
  assert.ok(plan.channels.includes("inspiration"));
  assert.ok(plan.channels.includes("article"));
});

test("MSE-25.9 only loads published inspiration content inside the tenant", async () => {
  let captured = null;

  const prisma = {
    seoContent: {
      findMany: async (query) => {
        captured = query;
        return [];
      },
    },
  };

  await hydrator.loadPublishedInspirations({
    prisma,
    tenantId: "tenant-mondescale",
    limit: 6,
  });

  assert.equal(captured.where.tenantId, "tenant-mondescale");
  assert.equal(captured.where.status, "published");
  assert.deepEqual(captured.where.publishedAt, { not: null });
  assert.equal(captured.take, 6);
});

test("MSE-25.9 maps SeoContent to safe public inspiration cards", () => {
  const card = hydrator.inspirationCard({
    id: "seo-1",
    slug: "sicile-hors-saison",
    title: "Découvrir la Sicile hors saison",
    excerpt: "Nos conseils pour profiter de la Sicile autrement.",
    channel: "article",
    publishedAt: new Date("2026-08-10T12:00:00Z"),
    body: {
      heroImageUrl: "https://cdn.example/sicile.jpg",
      category: "Conseils",
      internalPrompt: "must-not-leak",
    },
    seo: {
      privateMetadata: "must-not-leak",
    },
  });

  assert.equal(card.title, "Découvrir la Sicile hors saison");
  assert.equal(card.image, "https://cdn.example/sicile.jpg");
  assert.equal(card.category, "Conseils");
  assert.equal(card.body, undefined);
  assert.equal(card.seo, undefined);
  assert.equal(card.internalPrompt, undefined);
});

test("MSE-25.9 hydrates inspiration blocks from published content", () => {
  const pages = hydrator.hydrateInspirationBlocks(
    [
      {
        blocks: [
          {
            type: "inspirations",
            status: "published",
            content: {
              source: "content-generation",
              limit: 2,
            },
          },
        ],
      },
    ],
    [],
    [
      { id: "1", title: "Sicile", channel: "article", excerpt: "A" },
      { id: "2", title: "Maurice", channel: "article", excerpt: "B" },
      { id: "3", title: "Maldives", channel: "article", excerpt: "C" },
    ]
  );

  assert.equal(pages[0].blocks[0].content.items.length, 2);
  assert.equal(pages[0].blocks[0].content.items[0].title, "Sicile");
});
