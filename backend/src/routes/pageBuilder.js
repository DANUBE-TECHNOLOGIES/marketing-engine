const express = require("express");
const { BLOCK_DEFINITIONS, TEMPLATE_DEFINITIONS, composePage } = require("../lib/pageBuilder");
const { composeDestinationPage, buildPageCreateData } = require("../lib/miniSiteComposer");
const { normalizeDestinationSlugs, clampLimit, buildBatchPlan, summarizeBatch } = require("../lib/miniSiteBatchComposer");
const { buildInternalLinkPlan, buildRecommendationSectionData } = require("../lib/miniSiteInternalLinker");
const { buildContentGraph } = require("../lib/contentGraph");

module.exports = function createPageBuilderRoutes(prisma) {
  if (!prisma) throw new Error("Page Builder requires Prisma");
  const router = express.Router();

  router.get("/page-builder/health", async (_req, res) => {
    const [sites, pages, sections] = await Promise.all([
      prisma.agencySite.count(), prisma.agencySitePage.count(), prisma.agencySiteSection.count(),
    ]);
    res.json({ ok: true, version: "0.13.0", capability: "page-builder", counts: { sites, pages, sections } });
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

  router.get("/page-builder/composer/destinations", async (req, res, next) => {
    try {
      const siteSlug = String(req.query.site || "").trim();
      if (!siteSlug) return res.status(400).json({ error: "Le paramètre site est requis." });
      const site = await prisma.agencySite.findUnique({ where: { slug: siteSlug }, include: { agency: true } });
      if (!site) return res.status(404).json({ error: "Mini-site introuvable." });
      const slugs = normalizeDestinationSlugs(req.query.slugs);
      const limit = clampLimit(req.query.limit);
      const where = { status: "published", ...(slugs.length ? { slug: { in: slugs } } : {}) };
      const destinations = await prisma.destination.findMany({
        where,
        include: { countryRef: true, regionRef: true, cityRef: true, themes: { include: { theme: true }, orderBy: { weight: "desc" } }, travelTypes: { include: { travelType: true }, orderBy: { weight: "desc" } }, sections: { orderBy: { position: "asc" } }, faqs: { orderBy: { position: "asc" } }, relationsFrom: { include: { target: true }, orderBy: { score: "desc" } } },
        orderBy: { name: "asc" },
        take: limit,
      });
      const candidates = await prisma.destination.findMany({ where: { status: "published" }, include: { themes: true, travelTypes: true }, take: 500 });
      const existingPages = await prisma.agencySitePage.findMany({ where: { siteId: site.id, slug: { in: destinations.map((item) => item.slug) } } });
      const plan = buildBatchPlan({ destinations, existingPages, site, agency: site.agency, candidates, options: { overwrite: req.query.overwrite === "true", publish: req.query.publish === "true" } });
      res.json({ ok: true, mode: "preview", site: { id: site.id, slug: site.slug, name: site.name }, summary: summarizeBatch(plan), items: plan.map(({ data, ...item }) => item) });
    } catch (error) { next(error); }
  });

  router.post("/page-builder/composer/destinations/batch", async (req, res, next) => {
    try {
      const { siteSlug, slugs: rawSlugs, publish = false, overwrite = false, limit: rawLimit } = req.body || {};
      if (!siteSlug) return res.status(400).json({ error: "siteSlug is required" });
      const site = await prisma.agencySite.findUnique({ where: { slug: siteSlug }, include: { agency: true } });
      if (!site) return res.status(404).json({ error: "Mini-site introuvable." });
      const slugs = normalizeDestinationSlugs(rawSlugs);
      const limit = clampLimit(rawLimit);
      const where = { status: "published", ...(slugs.length ? { slug: { in: slugs } } : {}) };
      const destinations = await prisma.destination.findMany({
        where,
        include: { countryRef: true, regionRef: true, cityRef: true, themes: { include: { theme: true }, orderBy: { weight: "desc" } }, travelTypes: { include: { travelType: true }, orderBy: { weight: "desc" } }, sections: { orderBy: { position: "asc" } }, faqs: { orderBy: { position: "asc" } }, relationsFrom: { include: { target: true }, orderBy: { score: "desc" } } },
        orderBy: { name: "asc" },
        take: limit,
      });
      if (!destinations.length) return res.status(404).json({ error: "Aucune destination publiée ne correspond à la sélection." });
      const candidates = await prisma.destination.findMany({ where: { status: "published" }, include: { themes: true, travelTypes: true }, take: 500 });
      const existingPages = await prisma.agencySitePage.findMany({ where: { siteId: site.id, slug: { in: destinations.map((item) => item.slug) } } });
      const plan = buildBatchPlan({ destinations, existingPages, site, agency: site.agency, candidates, options: { overwrite, publish } });
      const results = [];
      for (const item of plan) {
        if (item.action === "skip") { results.push(item); continue; }
        try {
          const saved = await prisma.$transaction(async (tx) => {
            if (item.pageId) await tx.agencySitePage.delete({ where: { id: item.pageId } });
            return tx.agencySitePage.create({ data: item.data, include: { sections: { orderBy: { displayOrder: "asc" } } } });
          });
          results.push({ slug: item.slug, action: item.action, pageId: saved.id, path: saved.path, status: saved.status, sections: saved.sections.length });
        } catch (error) {
          results.push({ slug: item.slug, action: "failed", error: error.message });
        }
      }
      const summary = summarizeBatch(results);
      res.status(summary.failed ? 207 : 200).json({ ok: summary.failed === 0, site: { id: site.id, slug: site.slug, name: site.name }, summary, items: results });
    } catch (error) { next(error); }
  });

  router.get("/page-builder/internal-links", async (req, res, next) => {
    try {
      const siteSlug = String(req.query.site || "").trim();
      if (!siteSlug) return res.status(400).json({ error: "Le paramètre site est requis." });
      const site = await prisma.agencySite.findUnique({ where: { slug: siteSlug } });
      if (!site) return res.status(404).json({ error: "Mini-site introuvable." });
      const [destinations, pages] = await Promise.all([
        prisma.destination.findMany({ where: { status: "published" }, include: { themes: true, travelTypes: true, relationsFrom: { include: { target: true }, orderBy: { score: "desc" } } }, take: 500 }),
        prisma.agencySitePage.findMany({ where: { siteId: site.id, pageType: "destination" }, orderBy: { title: "asc" } }),
      ]);
      res.json({ ok: true, site: { id: site.id, slug: site.slug, name: site.name }, ...buildInternalLinkPlan({ destinations, pages, siteSlug, limit: req.query.limit }) });
    } catch (error) { next(error); }
  });

  router.post("/page-builder/internal-links/sync", async (req, res, next) => {
    try {
      const { siteSlug, publish = false, limit = 6 } = req.body || {};
      if (!siteSlug) return res.status(400).json({ error: "siteSlug is required" });
      const site = await prisma.agencySite.findUnique({ where: { slug: siteSlug } });
      if (!site) return res.status(404).json({ error: "Mini-site introuvable." });
      const [destinations, pages] = await Promise.all([
        prisma.destination.findMany({ where: { status: "published" }, include: { themes: true, travelTypes: true, relationsFrom: { include: { target: true }, orderBy: { score: "desc" } } }, take: 500 }),
        prisma.agencySitePage.findMany({ where: { siteId: site.id, pageType: "destination" }, include: { sections: true }, orderBy: { title: "asc" } }),
      ]);
      const plan = buildInternalLinkPlan({ destinations, pages, siteSlug, limit });
      const results = [];
      for (const item of plan.items) {
        try {
          const section = buildRecommendationSectionData(item.links, publish ? "published" : "draft");
          const saved = await prisma.agencySiteSection.upsert({
            where: { pageId_sectionType: { pageId: item.pageId, sectionType: section.sectionType } },
            create: { ...section, page: { connect: { id: item.pageId } } },
            update: { jsonContent: section.jsonContent, displayOrder: section.displayOrder, status: section.status },
          });
          results.push({ pageId: item.pageId, slug: item.slug, links: item.links.length, sectionId: saved.id, status: saved.status });
        } catch (error) { results.push({ pageId: item.pageId, slug: item.slug, error: error.message }); }
      }
      const failed = results.filter((item) => item.error).length;
      res.status(failed ? 207 : 200).json({ ok: failed === 0, site: { id: site.id, slug: site.slug, name: site.name }, summary: { pages: results.length, updated: results.length - failed, failed, links: results.reduce((sum, item) => sum + (item.links || 0), 0), orphans: plan.summary.orphans }, items: results });
    } catch (error) { next(error); }
  });

  async function loadContentGraph(siteSlug) {
    const [countries, regions, cities, destinations, themes, travelTypes, tags, site] = await Promise.all([
      prisma.country.findMany({ where: { status: "published" } }),
      prisma.region.findMany({ where: { status: "published" } }),
      prisma.city.findMany({ where: { status: "published" } }),
      prisma.destination.findMany({
        where: { status: "published" },
        include: {
          themes: true,
          travelTypes: true,
          tags: true,
          relationsFrom: true,
        },
      }),
      prisma.theme.findMany({ where: { status: "published" } }),
      prisma.travelType.findMany({ where: { status: "published" } }),
      prisma.tag.findMany({ where: { status: "active" } }),
      siteSlug ? prisma.agencySite.findUnique({
        where: { slug: siteSlug },
        include: { pages: true },
      }) : Promise.resolve(null),
    ]);
    if (siteSlug && !site) return null;
    return {
      site: site ? { id: site.id, slug: site.slug, name: site.name } : null,
      graph: buildContentGraph({ countries, regions, cities, destinations, themes, travelTypes, tags, pages: site?.pages || [] }),
    };
  }

  router.get("/page-builder/content-graph", async (req, res, next) => {
    try {
      const result = await loadContentGraph(String(req.query.site || "").trim() || null);
      if (!result) return res.status(404).json({ error: "Mini-site introuvable." });
      const type = String(req.query.type || "").trim();
      const status = String(req.query.status || "").trim();
      const nodes = result.graph.nodes.filter((node) => (!type || node.type === type) && (!status || node.status === status));
      const nodeIds = new Set(nodes.map((node) => node.graphId));
      const edges = type || status
        ? result.graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
        : result.graph.edges;
      res.json({ ok: true, site: result.site, graph: { ...result.graph, nodes, edges } });
    } catch (error) { next(error); }
  });

  router.get("/page-builder/content-graph/node/:type/:id", async (req, res, next) => {
    try {
      const result = await loadContentGraph(String(req.query.site || "").trim() || null);
      if (!result) return res.status(404).json({ error: "Mini-site introuvable." });
      const graphId = `${req.params.type}:${req.params.id}`;
      const neighborhood = getNodeNeighborhood(result.graph, graphId, req.query.depth || 1);
      if (!neighborhood.root) return res.status(404).json({ error: "Nœud introuvable.", graphId });
      res.json({ ok: true, site: result.site, graphId, depth: Math.max(0, Math.min(Number(req.query.depth) || 1, 3)), ...neighborhood });
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
