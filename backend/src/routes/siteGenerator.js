"use strict";

const express = require("express");
const { runSiteGenerationPipeline } = require("../lib/generationPipeline");
const { buildNavigation } = require("../lib/siteNavigationBuilder");
const { buildSitemap, buildRobots } = require("../lib/sitemapBuilder");

module.exports = function createSiteGeneratorRoutes(prisma) {
  if (!prisma) throw new Error("Site Generator requires Prisma");
  const router = express.Router();

  router.get("/site-generator/health", (_req, res) => res.json({ ok: true, version: "1.0.0", capability: "site-generator" }));

  router.post("/site-generator/sites/:siteSlug/preview", async (req, res) => {
    const result = await runSiteGenerationPipeline({ prisma, siteSlug: req.params.siteSlug, publish: Boolean(req.body?.publish), overwrite: Boolean(req.body?.overwrite), dryRun: true, baseUrl: req.body?.baseUrl || process.env.PUBLIC_BASE_URL || "http://localhost:3000" });
    res.status(result.ok ? 200 : 404).json(result);
  });

  router.post("/site-generator/sites/:siteSlug/generate", async (req, res) => {
    const result = await runSiteGenerationPipeline({ prisma, siteSlug: req.params.siteSlug, publish: Boolean(req.body?.publish), overwrite: Boolean(req.body?.overwrite), dryRun: false, baseUrl: req.body?.baseUrl || process.env.PUBLIC_BASE_URL || "http://localhost:3000" });
    res.status(result.ok ? (result.job.status === "partial" ? 207 : 200) : 404).json(result);
  });

  router.get("/site-generator/sites/:siteSlug/navigation", async (req, res, next) => {
    try {
      const site = await prisma.agencySite.findUnique({ where: { slug: req.params.siteSlug } });
      if (!site) return res.status(404).json({ error: "Mini-site introuvable" });
      const pages = await prisma.agencySitePage.findMany({ where: { siteId: site.id }, orderBy: [{ displayOrder: "asc" }, { title: "asc" }] });
      res.json({ ok: true, navigation: buildNavigation({ site, pages, includeDrafts: req.query.includeDrafts === "true" }) });
    } catch (error) { next(error); }
  });

  router.get("/public/site-generator/:siteSlug/sitemap.xml", async (req, res, next) => {
    try {
      const site = await prisma.agencySite.findUnique({ where: { slug: req.params.siteSlug } });
      if (!site) return res.status(404).type("text/plain").send("Mini-site introuvable");
      const pages = await prisma.agencySitePage.findMany({ where: { siteId: site.id, status: "published", published: true } });
      const sitemap = buildSitemap({ site, pages, baseUrl: process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}` });
      res.type("application/xml").send(sitemap.xml);
    } catch (error) { next(error); }
  });

  router.get("/public/site-generator/:siteSlug/robots.txt", async (req, res) => {
    res.type("text/plain").send(buildRobots({ baseUrl: process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`, siteSlug: req.params.siteSlug }));
  });

  return router;
};
