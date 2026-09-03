"use strict";

const express = require("express");
const { createSearchService } = require("./service");

module.exports = function createSearchRoutes(prisma) {
  const router = express.Router();
  const service = createSearchService(prisma);

  router.get("/search/health", (_req, res) => res.json({ ok: true, version: "1.0.0", capability: "content-discovery-engine" }));
  router.get("/search", async (req, res, next) => { try { res.json({ ok: true, ...(await service.search(req.query)) }); } catch (error) { next(error); } });
  router.get("/search/suggest", async (req, res, next) => { try { res.json({ ok: true, ...(await service.suggest(req.query)) }); } catch (error) { next(error); } });
  router.get("/search/facets", async (req, res, next) => { try { res.json({ ok: true, ...(await service.facets(req.query)) }); } catch (error) { next(error); } });
  router.get("/search/popular", async (req, res, next) => { try { res.json({ ok: true, ...(await service.popular(req.query)) }); } catch (error) { next(error); } });
  router.get("/search/related/:slug", async (req, res, next) => { try { res.json({ ok: true, ...(await service.related(req.params.slug, req.query)) }); } catch (error) { next(error); } });

  return router;
};
