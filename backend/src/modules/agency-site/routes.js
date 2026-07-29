const express = require("express");
const AgencySiteService = require("./service");
module.exports = ({ prisma }) => {
  const router = express.Router(); const service = new AgencySiteService(prisma);
  router.post("/agencies/:id/site/generate", async (req,res,next) => { try { res.status(201).json(await service.generate(req.params.id, req.body || {})); } catch(e) { next(e); } });
  router.post("/agencies/:id/site/compose", async (req,res,next) => { try { res.json(await service.compose(req.params.id)); } catch(e) { next(e); } });
  router.post("/agencies/:id/site/rebuild", async (req,res,next) => { try { res.json(await service.rebuild(req.params.id, req.body || {})); } catch(e) { next(e); } });
  router.get("/agencies/:id/site", async (req,res,next) => { try { res.json(await service.get(req.params.id)); } catch(e) { next(e); } });
  router.get("/agencies/:id/site/pages/home", async (req,res,next) => { try { res.json(await service.page(req.params.id, "")); } catch(e) { next(e); } });
  router.get("/agencies/:id/site/pages/:slug", async (req,res,next) => { try { res.json(await service.page(req.params.id, req.params.slug)); } catch(e) { next(e); } });
  router.get("/public/agency-sites/:siteSlug", async (req,res,next) => { try { res.json(await service.publicSite(req.params.siteSlug)); } catch(e) { next(e); } });
  router.get("/public/agency-sites/:siteSlug/pages/home", async (req,res,next) => { try { res.json(await service.publicPage(req.params.siteSlug, "")); } catch(e) { next(e); } });
  router.get("/public/agency-sites/:siteSlug/pages/:slug", async (req,res,next) => { try { res.json(await service.publicPage(req.params.siteSlug, req.params.slug)); } catch(e) { next(e); } });
  router.get("/agencies/:id/site/sitemap.xml", async (req,res,next) => { try { res.type("application/xml").send(await service.sitemap(req.params.id, req.query.origin)); } catch(e) { next(e); } });
  router.get("/agencies/:id/site/robots.txt", async (req,res,next) => { try { res.type("text/plain").send(await service.robots(req.params.id, req.query.origin)); } catch(e) { next(e); } });
  return router;
};
