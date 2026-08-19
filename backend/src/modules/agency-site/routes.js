const express = require("express");
const AgencySiteService = require("./service");
const { auditDraft, proposeLocalRewrite } = require("./local-rewrite-service");
const { buildPartnerPageRolloutStatus, ensureNetworkPartnerPages, ensurePartnerPageOnly } = require("./partner-page-rollout");
const { saveDesignerPage } = require("./page-builder-save");
const { listPageVersions, rollbackPageVersion } = require("./page-versions");

function publicPagePayload(page) {
  if (!page || typeof page !== "object") return page;
  if (Array.isArray(page.sections) && page.sections.length) return page;
  if (Array.isArray(page.blocks) && page.blocks.length) {
    return { ...page, sections: page.blocks };
  }
  return page;
}

module.exports = ({ prisma }) => {
  const router = express.Router();
  const serviceFor = (req) => new AgencySiteService(prisma, req.tenantId);
  const rewriteArgs = (req, slug) => ({
    prisma,
    tenantId: req.tenantId,
    agencyId: req.params.id,
    slug,
    draftPage: req.body?.page || null,
    blockId: req.body?.blockId || null,
  });
  const pageVersionArgs = (req, slug) => ({
    prisma,
    tenantId: req.tenantId,
    agencyId: req.params.id,
    slug,
  });
  const designerSaveArgs = (req, slug) => ({
    ...pageVersionArgs(req, slug),
    input: req.body || {},
  });

  router.get("/agency-sites", async (req, res, next) => {
    try { res.json(await serviceFor(req).listSites()); } catch (e) { next(e); }
  });
  router.get("/agency-sites/partners/rollout", async (req, res, next) => {
    try { res.json(await buildPartnerPageRolloutStatus(serviceFor(req))); } catch (e) { next(e); }
  });
  router.post("/agency-sites/partners/rollout", async (req, res, next) => {
    try {
      const result = await ensureNetworkPartnerPages(serviceFor(req), req.body || {});
      res.status(result.createdSiteCount > 0 ? 201 : 200).json(result);
    } catch (e) { next(e); }
  });
  router.post("/agencies/:id/site/generate", async (req, res, next) => {
    try { res.status(201).json(await serviceFor(req).generate(req.params.id, req.body || {})); } catch (e) { next(e); }
  });
  router.post("/agencies/:id/site/compose", async (req, res, next) => {
    try { res.json(await serviceFor(req).compose(req.params.id)); } catch (e) { next(e); }
  });
  router.post("/agencies/:id/site/rebuild", async (req, res, next) => {
    try { res.json(await serviceFor(req).rebuild(req.params.id, req.body || {})); } catch (e) { next(e); }
  });
  router.post("/agencies/:id/site/partners/ensure", async (req, res, next) => {
    try {
      const service = serviceFor(req);
      const result = await ensurePartnerPageOnly(service, req.params.id, req.body || {});
      res.status(result.created > 0 ? 201 : 200).json(result);
    } catch (e) { next(e); }
  });
  router.post("/agencies/:id/site/seo-draft-pages", async (req, res, next) => {
    try {
      const result = await serviceFor(req).createSeoDraftPage(req.params.id, req.body || {});
      res.status(result.created ? 201 : 200).json(result);
    } catch (e) { next(e); }
  });
  router.get("/agencies/:id/site", async (req, res, next) => {
    try { res.json(await serviceFor(req).get(req.params.id)); } catch (e) { next(e); }
  });

  router.get("/agencies/:id/site/pages/home/uniqueness", async (req, res, next) => {
    try { res.json(await serviceFor(req).uniqueness(req.params.id, "home")); } catch (e) { next(e); }
  });
  router.get("/agencies/:id/site/pages/:slug/uniqueness", async (req, res, next) => {
    try { res.json(await serviceFor(req).uniqueness(req.params.id, req.params.slug)); } catch (e) { next(e); }
  });
  router.post("/agencies/:id/site/pages/home/uniqueness", async (req, res, next) => {
    try {
      const args = rewriteArgs(req, "home");
      res.json(req.body?.action === "rewrite" ? await proposeLocalRewrite(args) : await auditDraft(args));
    } catch (e) { next(e); }
  });
  router.post("/agencies/:id/site/pages/:slug/uniqueness", async (req, res, next) => {
    try {
      const args = rewriteArgs(req, req.params.slug);
      res.json(req.body?.action === "rewrite" ? await proposeLocalRewrite(args) : await auditDraft(args));
    } catch (e) { next(e); }
  });

  router.get("/agencies/:id/site/pages/home/versions", async (req, res, next) => {
    try { res.json(await listPageVersions(pageVersionArgs(req, "home"))); } catch (e) { next(e); }
  });
  router.get("/agencies/:id/site/pages/:slug/versions", async (req, res, next) => {
    try { res.json(await listPageVersions(pageVersionArgs(req, req.params.slug))); } catch (e) { next(e); }
  });
  router.post("/agencies/:id/site/pages/home/versions/:versionId/rollback", async (req, res, next) => {
    try {
      res.json(await rollbackPageVersion({
        ...pageVersionArgs(req, "home"),
        versionId: req.params.versionId,
        input: req.body || {},
      }));
    } catch (e) { next(e); }
  });
  router.post("/agencies/:id/site/pages/:slug/versions/:versionId/rollback", async (req, res, next) => {
    try {
      res.json(await rollbackPageVersion({
        ...pageVersionArgs(req, req.params.slug),
        versionId: req.params.versionId,
        input: req.body || {},
      }));
    } catch (e) { next(e); }
  });

  router.put("/agencies/:id/site/pages/home/blocks", async (req, res, next) => {
    try { res.json(await saveDesignerPage(designerSaveArgs(req, "home"))); } catch (e) { next(e); }
  });
  router.put("/agencies/:id/site/pages/:slug/blocks", async (req, res, next) => {
    try { res.json(await saveDesignerPage(designerSaveArgs(req, req.params.slug))); } catch (e) { next(e); }
  });
  router.get("/agencies/:id/site/pages/home", async (req, res, next) => {
    try { res.json(await serviceFor(req).page(req.params.id, "home")); } catch (e) { next(e); }
  });
  router.get("/agencies/:id/site/pages/:slug", async (req, res, next) => {
    try { res.json(await serviceFor(req).page(req.params.id, req.params.slug)); } catch (e) { next(e); }
  });
  router.put("/agencies/:id/site/pages/home/sections", async (req, res, next) => {
    try { res.json(await serviceFor(req).replacePageSections(req.params.id, "home", req.body || {})); } catch (e) { next(e); }
  });
  router.put("/agencies/:id/site/pages/:slug/sections", async (req, res, next) => {
    try { res.json(await serviceFor(req).replacePageSections(req.params.id, req.params.slug, req.body || {})); } catch (e) { next(e); }
  });
  router.get("/public/agency-sites/:siteSlug", async (req, res, next) => {
    try { res.json(await serviceFor(req).publicSite(req.params.siteSlug)); } catch (e) { next(e); }
  });
  router.get("/public/agency-sites/:siteSlug/pages/home", async (req, res, next) => {
    try { res.json(publicPagePayload(await serviceFor(req).publicPage(req.params.siteSlug, "home"))); } catch (e) { next(e); }
  });
  router.get("/public/agency-sites/:siteSlug/pages/:slug", async (req, res, next) => {
    try { res.json(publicPagePayload(await serviceFor(req).publicPage(req.params.siteSlug, req.params.slug))); } catch (e) { next(e); }
  });
  router.get("/agencies/:id/site/sitemap.xml", async (req, res, next) => {
    try { res.type("application/xml").send(await serviceFor(req).sitemap(req.params.id, req.query.origin)); } catch (e) { next(e); }
  });
  router.get("/agencies/:id/site/robots.txt", async (req, res, next) => {
    try { res.type("text/plain").send(await serviceFor(req).robots(req.params.id, req.query.origin)); } catch (e) { next(e); }
  });

  return router;
};

module.exports.publicPagePayload = publicPagePayload;
