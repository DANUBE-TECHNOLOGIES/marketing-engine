const express = require("express");
const { BLOCK_DEFINITIONS, TEMPLATE_DEFINITIONS, composePage } = require("../lib/pageBuilder");

module.exports = function createPageBuilderRoutes(prisma) {
  if (!prisma) throw new Error("Page Builder requires Prisma");
  const router = express.Router();

  router.get("/page-builder/health", async (_req, res) => {
    const [sites, pages, sections] = await Promise.all([
      prisma.agencySite.count(), prisma.agencySitePage.count(), prisma.agencySiteSection.count(),
    ]);
    res.json({ ok: true, version: "0.9.3", capability: "page-builder", counts: { sites, pages, sections } });
  });

  router.get("/page-builder/blocks", (_req, res) => {
    res.json({ items: Object.entries(BLOCK_DEFINITIONS).map(([type, definition]) => ({ type, ...definition })) });
  });

  router.get("/page-builder/templates", (_req, res) => {
    res.json({ items: Object.entries(TEMPLATE_DEFINITIONS).map(([code, template]) => ({ code, ...template })) });
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
