const express = require("express");
const { BLOCK_DEFINITIONS, TEMPLATE_DEFINITIONS, composePage } = require("../lib/pageBuilder");
const { composeDestinationPage, buildPageCreateData } = require("../lib/miniSiteComposer");

module.exports = function createPageBuilderRoutes(prisma) {
  if (!prisma) throw new Error("Page Builder requires Prisma");
  const router = express.Router();

  router.get("/page-builder/health", async (_req, res) => {
    const [sites, pages, sections] = await Promise.all([
      prisma.agencySite.count(), prisma.agencySitePage.count(), prisma.agencySiteSection.count(),
    ]);
    res.json({ ok: true, version: "0.10.1", capability: "page-builder", counts: { sites, pages, sections } });
  });

  router.get("/page-builder/blocks", (_req, res) => {
    res.json({ items: Object.entries(BLOCK_DEFINITIONS).map(([type, definition]) => ({ type, ...definition })) });
  });

  router.get("/page-builder/templates", (_req, res) => {
    res.json({ items: Object.entries(TEMPLATE_DEFINITIONS).map(([code, template]) => ({ code, ...template })) });
  });


  router.get("/page-builder/composer/destination/:slug", async (req, res, next) => {
    try {
      const destination = await prisma.destination.findFirst({
        where: { slug: req.params.slug, status: "published" },
        include: { countryRef: true, regionRef: true, cityRef: true, themes: { include: { theme: true }, orderBy: { weight: "desc" } }, travelTypes: { include: { travelType: true }, orderBy: { weight: "desc" } }, sections: { orderBy: { position: "asc" } }, faqs: { orderBy: { position: "asc" } }, relationsFrom: { include: { target: true }, orderBy: { score: "desc" } } },
      });
      if (!destination) return res.status(404).json({ error: "Destination introuvable." });
      const site = await prisma.agencySite.findUnique({ where: { slug: String(req.query.site || "") }, include: { agency: true } });
      if (!site) return res.status(404).json({ error: "Mini-site introuvable. Utilisez ?site=slug-du-site" });
      const candidates = await prisma.destination.findMany({ where: { id: { not: destination.id }, status: "published" }, include: { themes: true, travelTypes: true }, take: 200 });
      res.json({ ok: true, mode: "preview", page: composeDestinationPage({ destination, site, agency: site.agency, candidates }) });
    } catch (error) { next(error); }
  });

  router.post("/page-builder/composer/destination/:slug", async (req, res, next) => {
    try {
      const { siteSlug, publish = false, overwrite = false } = req.body || {};
      if (!siteSlug) return res.status(400).json({ error: "siteSlug is required" });
      const [destination, site] = await Promise.all([
        prisma.destination.findFirst({ where: { slug: req.params.slug, status: "published" }, include: { countryRef: true, regionRef: true, cityRef: true, themes: { include: { theme: true }, orderBy: { weight: "desc" } }, travelTypes: { include: { travelType: true }, orderBy: { weight: "desc" } }, sections: { orderBy: { position: "asc" } }, faqs: { orderBy: { position: "asc" } }, relationsFrom: { include: { target: true }, orderBy: { score: "desc" } } } }),
        prisma.agencySite.findUnique({ where: { slug: siteSlug }, include: { agency: true } }),
      ]);
      if (!destination || !site) return res.status(404).json({ error: "Destination ou mini-site introuvable." });
      const existing = await prisma.agencySitePage.findUnique({ where: { siteId_slug: { siteId: site.id, slug: destination.slug } } });
      if (existing && !overwrite) return res.status(409).json({ error: "La page existe déjà. Utilisez overwrite=true pour la régénérer.", pageId: existing.id });
      const candidates = await prisma.destination.findMany({ where: { id: { not: destination.id }, status: "published" }, include: { themes: true, travelTypes: true }, take: 200 });
      const composed = composeDestinationPage({ destination, site, agency: site.agency, candidates, options: { status: publish ? "published" : "draft" } });
      const saved = await prisma.$transaction(async (tx) => {
        if (existing) await tx.agencySitePage.delete({ where: { id: existing.id } });
        return tx.agencySitePage.create({ data: buildPageCreateData(composed, site.id), include: { sections: { orderBy: { displayOrder: "asc" } } } });
      });
      res.status(existing ? 200 : 201).json({ ok: true, created: !existing, page: saved });
    } catch (error) { next(error); }
  });

  router.post("/page-builder/render", (req, res) => {
    const { page, site, baseUrl } = req.body || {};
    if (!page || !site) return res.status(400).json({ error: "page and site are required" });
    res.json(composePage(page, site, { baseUrl }));
  });

  router.get("/page-builder/pages/:pageId/preview", async (req, res, next) => {
    try {
      const page = await prisma.agencySitePage.findUnique({
        where: { id: req.params.pageId },
        include: { site: true, sections: { orderBy: { displayOrder: "asc" } } },
      });
      if (!page) return res.status(404).json({ error: "Page not found" });
      res.json(composePage(page, page.site));
    } catch (error) { next(error); }
  });

  router.get("/public/page-builder/:siteSlug/:pageSlug", async (req, res, next) => {
    try {
      const page = await prisma.agencySitePage.findFirst({
        where: {
          slug: req.params.pageSlug === "home" ? "" : req.params.pageSlug,
          status: "published", published: true,
          site: { slug: req.params.siteSlug, status: "published" },
        },
        include: { site: true, sections: { where: { status: "published" }, orderBy: { displayOrder: "asc" } } },
      });
      if (!page) return res.status(404).json({ error: "Published page not found" });
      res.json(composePage(page, page.site));
    } catch (error) { next(error); }
  });

  return router;
};
