const express = require("express");

const PUBLISHED = "published";

function parseLimit(value, fallback = 100, max = 500) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function pageWhere() {
  return { status: PUBLISHED, published: true };
}

function tenantSlug(req) {
  return String(
    req.headers["x-tenant-slug"] || "mondescale"
  )
    .trim()
    .toLowerCase();
}

function destinationWhere(req) {
  const where = {
    status: PUBLISHED,
    tenant: {
      is: {
        slug: tenantSlug(req),
      },
    },
  };

  if (req.query.country) where.country = req.query.country;
  if (req.query.type) where.type = req.query.type;

  return where;
}

function createPublicCatalogRoutes(prisma) {
  if (!prisma) throw new Error("Public Catalog requires Prisma");

  const router = express.Router();

  router.get("/public/agency-sites", async (req, res, next) => {
    try {
      const items = await prisma.agencySite.findMany({
        where: { status: PUBLISHED },
        take: parseLimit(req.query.limit),
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          agencyId: true,
          name: true,
          slug: true,
          basePath: true,
          theme: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
          pages: {
            where: pageWhere(),
            orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
            select: {
              id: true,
              title: true,
              slug: true,
              path: true,
              pageType: true,
              menuTitle: true,
              menuLocation: true,
              displayOrder: true,
              seoTitle: true,
              metaDescription: true,
              h1: true,
              schemaType: true,
              status: true,
              published: true,
              updatedAt: true,
            },
          },
        },
      });
      res.json({ items, count: items.length });
    } catch (error) { next(error); }
  });

  router.get("/public/agency-sites/:slug", async (req, res, next) => {
    try {
      const item = await prisma.agencySite.findFirst({
        where: { slug: req.params.slug, status: PUBLISHED },
        select: {
          id: true, agencyId: true, name: true, slug: true, basePath: true,
          theme: true, status: true, publishedAt: true, updatedAt: true,
          agency: { select: { id: true, name: true, city: true, address: true, phone: true, email: true } },
          pages: {
            where: pageWhere(),
            orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
            include: {
              sections: {
                where: { status: PUBLISHED },
                orderBy: { displayOrder: "asc" },
              },
            },
          },
        },
      });
      if (!item) return res.status(404).json({ error: "Published agency site not found" });
      res.json(item);
    } catch (error) { next(error); }
  });

  router.get("/public/destinations", async (req, res, next) => {
    try {
      const items = await prisma.destination.findMany({
        where: destinationWhere(req),
        take: parseLimit(req.query.limit),
        orderBy: [{ country: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, slug: true, country: true, region: true,
          type: true, status: true, tagline: true, summary: true,
          heroImageUrl: true, seoTitle: true, seoDescription: true,
          bestTime: true, idealDuration: true, highlights: true,
          audiences: true, publishedAt: true, updatedAt: true,
        },
      });
      res.json({ items, count: items.length });
    } catch (error) { next(error); }
  });

  router.get("/public/destinations/:slug", async (req, res, next) => {
    try {
      const item = await prisma.destination.findFirst({
        where: {
          ...destinationWhere(req),
          slug: req.params.slug,
        },
        include: {
          sections: { orderBy: { position: "asc" } },
          faqs: { orderBy: { position: "asc" } },
        },
      });
      if (!item) return res.status(404).json({ error: "Published destination not found" });
      res.json(item);
    } catch (error) { next(error); }
  });

  router.get("/public/pages", async (req, res, next) => {
    try {
      const where = { ...pageWhere(), site: { status: PUBLISHED } };
      if (req.query.siteSlug) where.site = { status: PUBLISHED, slug: req.query.siteSlug };
      if (req.query.pageType) where.pageType = req.query.pageType;
      const items = await prisma.agencySitePage.findMany({
        where,
        take: parseLimit(req.query.limit),
        orderBy: [{ siteId: "asc" }, { displayOrder: "asc" }],
        select: {
          id: true, siteId: true, parentId: true, title: true, slug: true,
          path: true, pageType: true, menuTitle: true, menuLocation: true,
          displayOrder: true, seoTitle: true, metaDescription: true, h1: true,
          schemaType: true, status: true, published: true, updatedAt: true,
          site: { select: { name: true, slug: true, basePath: true, updatedAt: true } },
        },
      });
      res.json({ items, count: items.length });
    } catch (error) { next(error); }
  });

  router.get("/public/pages/:slug", async (req, res, next) => {
    try {
      const where = {
        slug: req.params.slug,
        ...pageWhere(),
        site: req.query.siteSlug
          ? { status: PUBLISHED, slug: req.query.siteSlug }
          : { status: PUBLISHED },
      };
      const item = await prisma.agencySitePage.findFirst({
        where,
        include: {
          site: { select: { name: true, slug: true, basePath: true, updatedAt: true } },
          sections: { where: { status: PUBLISHED }, orderBy: { displayOrder: "asc" } },
        },
      });
      if (!item) return res.status(404).json({ error: "Published page not found" });
      res.json(item);
    } catch (error) { next(error); }
  });

  return router;
}

module.exports = createPublicCatalogRoutes;
