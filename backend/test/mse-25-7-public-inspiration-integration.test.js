"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hydrateContract,
} = require("../src/modules/public-site-read/routes");
const {
  hydratePreviewPage,
} = require("../src/modules/public-site-read/preview-hydrator");

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

function inspirationBlock(settings = {}) {
  return {
    id: "insp-1",
    type: "inspirations",
    blockType: "inspirations",
    status: "published",
    content: {
      title: "Inspirations voyage",
    },
    settings: {
      __dataSource: "content-generation",
      selectionMode: "automatic",
      limit: "2",
      ...settings,
    },
  };
}

function prismaRuntime(items) {
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
    agencySite: {
      findFirst: async ({ where }) =>
        where.slug === "ambassade-fram-mondescale-dax"
          ? {
              id: "site-dax",
              agencyId: 3,
              tenantId: "tenant_mondescale",
              agency: {
                tenantId: "tenant_mondescale",
              },
            }
          : null,
    },
  };
}

test("MSE-25.7 hydrateContract remplace homePage et page par la version enrichie", async () => {
  const home = {
    id: "home",
    slug: "home",
    blocks: [inspirationBlock()],
  };

  const contract = await hydrateContract({
    database: prismaRuntime([
      content("1"),
      content("2"),
      content("3"),
    ]),
    contract: {
      site: {
        id: "site-dax",
        tenantId: "tenant_mondescale",
        agencyId: 3,
      },
      agency: { id: 3 },
      pages: [home],
      homePage: home,
      page: home,
    },
  });

  assert.deepEqual(
    contract.pages[0].blocks[0].content.items.map((item) => item.id),
    ["3", "2"]
  );
  assert.equal(contract.homePage, contract.pages[0]);
  assert.equal(contract.page, contract.pages[0]);
});

test("MSE-25.7 hydratePreviewPage enrichit aussi les blocs brouillon du Designer V2", async () => {
  const result = await hydratePreviewPage({
    prisma: prismaRuntime([
      content("1"),
      content("2"),
      content("3"),
    ]),
    siteSlug: "ambassade-fram-mondescale-dax",
    page: {
      id: "draft-home",
      slug: "home",
      blocks: [
        {
          ...inspirationBlock({
            selectionMode: "manual",
            contentIds: ["2", "1"],
          }),
          status: "draft",
        },
      ],
    },
  });

  assert.equal(result.context.tenantId, "tenant_mondescale");
  assert.equal(result.context.agencyId, 3);
  assert.deepEqual(
    result.page.blocks[0].content.items.map((item) => item.id),
    ["2", "1"]
  );
});
