const express = require("express");
const MiniSiteService = require("./service");
const { validateCreateSite, validateUpdateSite, validateCreatePage, validateUpdatePage, validateDestinationCluster } = require("./validation");
module.exports = ({ prisma }) => {
  const router = express.Router();
  const serviceFor = (req) => new MiniSiteService(prisma, req.tenantId);
  router.get("/mini-sites", async (req, res, next) => { try { res.json(await serviceFor(req).list()); } catch (error) { next(error); } });
  router.get("/mini-sites/:id", async (req, res, next) => { try { res.json(await serviceFor(req).get(req.params.id)); } catch (error) { next(error); } });
  router.post("/mini-sites", async (req, res, next) => { try { res.status(201).json(await serviceFor(req).create(validateCreateSite(req.body))); } catch (error) { next(error); } });
  router.put("/mini-sites/:id", async (req, res, next) => { try { res.json(await serviceFor(req).update(req.params.id, validateUpdateSite(req.body))); } catch (error) { next(error); } });
  router.delete("/mini-sites/:id", async (req, res, next) => { try { await serviceFor(req).delete(req.params.id); res.sendStatus(204); } catch (error) { next(error); } });
  router.get("/mini-sites/:id/pages", async (req, res, next) => { try { res.json(await serviceFor(req).listPages(req.params.id)); } catch (error) { next(error); } });
  router.post("/mini-sites/:id/pages", async (req, res, next) => { try { res.status(201).json(await serviceFor(req).createPage(req.params.id, validateCreatePage(req.body))); } catch (error) { next(error); } });
  router.post("/mini-sites/:id/destinations", async (req, res, next) => { try { res.status(201).json(await serviceFor(req).createDestinationCluster(req.params.id, validateDestinationCluster(req.body))); } catch (error) { next(error); } });
  router.put("/mini-sites/pages/:pageId", async (req, res, next) => { try { res.json(await serviceFor(req).updatePage(req.params.pageId, validateUpdatePage(req.body))); } catch (error) { next(error); } });
  router.delete("/mini-sites/pages/:pageId", async (req, res, next) => { try { await serviceFor(req).deletePage(req.params.pageId); res.sendStatus(204); } catch (error) { next(error); } });
  return router;
};
