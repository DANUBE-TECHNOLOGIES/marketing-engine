const assert = require("node:assert/strict");
const test = require("node:test");
const DestinationGenerator = require("../src/modules/mini-site/destination-generator");
const MiniSiteService = require("../src/modules/mini-site/service");
const { validateDestinationCluster } = require("../src/modules/mini-site/validation");

const agency = { id: 1, name: "Mondescale Melun", city: "Melun", address: "1 rue Test", postalCode: "77000", phone: "0102030405", email: "melun@example.test", website: "https://example.test", googleReviewUrl: null };
const site = { id: "site-1", agencyId: "1", name: "Voyages Mondescale", slug: "voyages-mondescale", domain: null, pages: [] };

function fakePrisma({ existing = [] } = {}) {
  const pages = [...existing];
  let seq = 0;

  const findSite = async ({ where }) => {
    if (where.id !== site.id) return null;

    return {
      ...site,
      pages: pages
        .filter((page) => page.miniSiteId === site.id)
        .map((page) => ({ ...page })),
    };
  };

  const miniSitePage = {
    findMany: async ({ where }) =>
      pages
        .filter(
          (page) =>
            page.miniSiteId === where.miniSiteId &&
            (
              !where.slug?.in ||
              where.slug.in.includes(page.slug)
            )
        )
        .map((page) => ({ ...page })),

    deleteMany: async ({ where }) => {
      const before = pages.length;

      for (let index = pages.length - 1; index >= 0; index -= 1) {
        const page = pages[index];

        if (
          page.miniSiteId === where.miniSiteId &&
          where.slug.in.includes(page.slug)
        ) {
          pages.splice(index, 1);
        }
      }

      return { count: before - pages.length };
    },

    createMany: async ({ data }) => {
      for (const item of data) {
        pages.push({
          id: `p-${++seq}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...item,
        });
      }

      return { count: data.length };
    },
  };

  const tx = {
    miniSite: {
      findFirst: async ({ where }) =>
        where.id === site.id
          ? { id: site.id }
          : null,
    },

    miniSitePage,
  };

  return {
    agency: {
      findUnique: async ({ where }) =>
        where.id === 1 ? agency : null,
    },

    miniSite: {
      findUnique: findSite,
      findFirst: findSite,
    },

    miniSitePage,

    $transaction: async (callback) => callback(tx),
  };
}

test("valide les données d'une destination", () => {
  const data = validateDestinationCluster({ destination: " Budapest ", priceFrom: "299", highlights: ["Bains thermaux"], faq: [{ question: "Quand partir ?", answer: "Au printemps." }] });
  assert.equal(data.destination, "Budapest");
  assert.equal(data.priceFrom, 299);
  assert.equal(data.faq.length, 1);
});

test("génère huit pages SEO cohérentes", () => {
  const pages = new DestinationGenerator().generate(site, agency, validateDestinationCluster({ destination: "Budapest", country: "Hongrie" }));
  assert.equal(pages.length, 8);
  assert.equal(new Set(pages.map((page) => page.slug)).size, 8);
  assert.ok(pages.every((page) => page.seoTitle.length <= 70));
  assert.ok(pages.every((page) => page.seoDesc.length <= 180));
});

test("crée le cluster destination dans une transaction", async () => {
  const service = new MiniSiteService(fakePrisma());
  const result = await service.createDestinationCluster(site.id, validateDestinationCluster({ destination: "Budapest", highlights: ["Danube"] }));
  assert.equal(result.count, 8);
  assert.equal(result.pages.length, 8);
});

test("refuse d'écraser un cluster existant sans autorisation", async () => {
  const service = new MiniSiteService(fakePrisma({ existing: [{ id: "old", miniSiteId: site.id, slug: "budapest" }] }));
  await assert.rejects(service.createDestinationCluster(site.id, validateDestinationCluster({ destination: "Budapest" })), (error) => error.statusCode === 409);
});

test("régénère un cluster avec overwrite=true", async () => {
  const service = new MiniSiteService(fakePrisma({ existing: [{ id: "old", miniSiteId: site.id, slug: "budapest" }] }));
  const result = await service.createDestinationCluster(site.id, validateDestinationCluster({ destination: "Budapest", overwrite: true }));
  assert.equal(result.count, 8);
});
