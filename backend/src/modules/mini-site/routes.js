const express = require("express");
const MiniSiteService = require("./service");
const { validateCreateSite, validateUpdateSite, validateCreatePage, validateUpdatePage, validateDestinationCluster } = require("./validation");
module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new MiniSiteService(prisma);
  router.get("/mini-sites", async (req, res, next) => { try { res.json(await service.list()); } catch (error) { next(error); } });
  router.get("/mini-sites/:id", async (req, res, next) => { try { res.json(await service.get(req.params.id)); } catch (error) { next(error); } });
  router.post("/mini-sites", async (req, res, next) => { try { res.status(201).json(await service.create(validateCreateSite(req.body))); } catch (error) { next(error); } });
  router.put("/mini-sites/:id", async (req, res, next) => { try { res.json(await service.update(req.params.id, validateUpdateSite(req.body))); } catch (error) { next(error); } });
  router.delete("/mini-sites/:id", async (req, res, next) => { try { await service.delete(req.params.id); res.sendStatus(204); } catch (error) { next(error); } });
  router.get("/mini-sites/:id/pages", async (req, res, next) => { try { res.json(await service.listPages(req.params.id)); } catch (error) { next(error); } });
  router.post("/mini-sites/:id/pages", async (req, res, next) => { try { res.status(201).json(await service.createPage(req.params.id, validateCreatePage(req.body))); } catch (error) { next(error); } });
  router.post("/mini-sites/:id/destinations", async (req, res, next) => { try { res.status(201).json(await service.createDestinationCluster(req.params.id, validateDestinationCluster(req.body))); } catch (error) { next(error); } });
  router.put("/mini-sites/pages/:pageId", async (req, res, next) => { try { res.json(await service.updatePage(req.params.pageId, validateUpdatePage(req.body))); } catch (error) { next(error); } });
  router.delete("/mini-sites/pages/:pageId", async (req, res, next) => { try { await service.deletePage(req.params.pageId); res.sendStatus(204); } catch (error) { next(error); } });
  return router;
};
