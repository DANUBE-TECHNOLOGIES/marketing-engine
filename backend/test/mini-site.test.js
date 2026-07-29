const assert = require("node:assert/strict");
const test = require("node:test");
const MiniSiteGenerator = require("../src/modules/mini-site/generator");
const MiniSiteService = require("../src/modules/mini-site/service");
const { validateCreateSite, validateCreatePage } = require("../src/modules/mini-site/validation");

function fakePrisma() {
  const sites = [];
  const pages = [];
  let siteSeq = 0;
  let pageSeq = 0;

  const tx = {
    miniSite: {
      create: async ({ data }) => {
        const site = { id: `site-${++siteSeq}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        sites.push(site);
        return site;
      },
      findUnique: async ({ where }) => {
        const site = sites.find((item) => item.id === where.id) || null;
        return site ? { ...site, pages: pages.filter((page) => page.miniSiteId === site.id) } : null;
      },
    },
    miniSitePage: {
      createMany: async ({ data }) => {
        data.forEach((item) => pages.push({ id: `page-${++pageSeq}`, ...item, createdAt: new Date(), updatedAt: new Date() }));
        return { count: data.length };
      },
    },
  };

  return {
    agency: { findUnique: async ({ where }) => where.id === 1 ? { id: 1, name: "Mondescale" } : null },
    miniSite: {
      findUnique: tx.miniSite.findUnique,
      findMany: async () => sites,
      update: async ({ where, data }) => Object.assign(sites.find((site) => site.id === where.id), data),
      delete: async ({ where }) => sites.splice(sites.findIndex((site) => site.id === where.id), 1)[0],
    },
    miniSitePage: {
      findMany: async ({ where }) => pages.filter((page) => page.miniSiteId === where.miniSiteId),
      findUnique: async ({ where }) => pages.find((page) => page.id === where.id) || null,
      create: async ({ data }) => ({ id: `page-${++pageSeq}`, ...data }),
      update: async ({ where, data }) => Object.assign(pages.find((page) => page.id === where.id), data),
      delete: async ({ where }) => pages.splice(pages.findIndex((page) => page.id === where.id), 1)[0],
    },
    $transaction: async (callback) => callback(tx),
  };
}

test("normalise et filtre la création d'un mini-site", () => {
  const result = validateCreateSite({ agencyId: 1, name: "  Budapest depuis Melun  ", ignored: "nope" });
  assert.deepEqual(result, {
    agencyId: "1",
    name: "Budapest depuis Melun",
    slug: "budapest-depuis-melun",
    domain: null,
    status: "draft",
    templateId: null,
  });
});

test("génère les quatre pages fondamentales", () => {
  const pages = new MiniSiteGenerator().generateDefaultPages("Mondescale Melun");
  assert.equal(pages.length, 4);
  assert.deepEqual(pages.map((page) => page.slug), ["", "contact", "faq", "mentions-legales"]);
});

test("crée le mini-site et ses pages dans une transaction", async () => {
  const service = new MiniSiteService(fakePrisma());
  const created = await service.create(validateCreateSite({ agencyId: 1, name: "Budapest depuis Melun" }));
  assert.equal(created.pages.length, 4);
  assert.equal(created.agencyId, "1");
});

test("refuse une agence inexistante", async () => {
  const service = new MiniSiteService(fakePrisma());
  await assert.rejects(
    service.create(validateCreateSite({ agencyId: 999, name: "Test" })),
    (error) => error.statusCode === 404 && error.code === "NOT_FOUND"
  );
});

test("valide une page sans accepter de contenu non objet", () => {
  assert.throws(() => validateCreatePage({ type: "GUIDE", title: "Guide", content: "html" }), /objet JSON/);
  const page = validateCreatePage({ type: "GUIDE", title: "Que faire à Budapest ?", content: {} });
  assert.equal(page.slug, "que-faire-a-budapest");
});
