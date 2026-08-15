const express = require("express");
const { validateSiteCreation, validatePageCreation } = require("./validation");

function createAgencySeoRoutes(service) {
  const router = express.Router();
  router.get("/sites", async (req, res, next) => { try { const sites = await service.listSites(); res.json({ total: sites.length, sites }); } catch (error) { next(error); } });
  router.get("/sites/:id", async (req, res, next) => { try { res.json({ site: await service.getSite(req.params.id) }); } catch (error) { next(error); } });
  router.post("/sites", async (req, res, next) => { try { const site = await service.createSite(validateSiteCreation(req.body)); res.status(201).json({ site }); } catch (error) { next(error); } });
  router.patch("/sites/:id", async (req, res, next) => { try { res.json({ site: await service.updateSite(req.params.id, req.body) }); } catch (error) { next(error); } });
  router.get("/sites/:siteId/pages", async (req, res, next) => { try { await service.getSite(req.params.siteId); const pages = await service.listPages(req.params.siteId); res.json({ total: pages.length, pages }); } catch (error) { next(error); } });
  router.get("/pages/:id", async (req, res, next) => { try { res.json({ page: await service.getPage(req.params.id) }); } catch (error) { next(error); } });
  router.post("/pages", async (req, res, next) => { try { const page = await service.createPage(validatePageCreation(req.body)); res.status(201).json({ page }); } catch (error) { next(error); } });
  router.patch("/pages/:id", async (req, res, next) => { try { res.json({ page: await service.updatePage(req.params.id, req.body) }); } catch (error) { next(error); } });

  router.get("/pages/:id/local-optimization", async (req, res, next) => { try { res.json(await service.previewLocalOptimization(req.params.id)); } catch (error) { next(error); } });
  router.post("/pages/:id/local-optimization/apply", async (req, res, next) => { try { res.json(await service.applyLocalOptimization(req.params.id, { reviewed: req.body?.reviewed === true })); } catch (error) { next(error); } });
  return router;
}

module.exports = createAgencySeoRoutes;
