"use strict";

const express = require("express");
const { InternalLinkingRepository } = require("./repository");
const { InternalLinkingService } = require("./service");

function createRoutes({ prisma }) {
  const router = express.Router();
  const service = new InternalLinkingService(new InternalLinkingRepository(prisma));
  const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

  router.get("/links/health", asyncRoute(async (_req, res) => res.json(await service.health())));

  router.get("/links/destination/:slug", asyncRoute(async (req, res) => {
    res.json(await service.suggestionsForDestination(req.params.slug, req.query));
  }));

  router.get("/links/page/:id", asyncRoute(async (req, res) => {
    res.json(await service.suggestionsForPage(req.params.id, req.query));
  }));

  router.post("/links/page/:id", asyncRoute(async (req, res) => {
    res.json(await service.suggestionsForPage(req.params.id, req.body || {}));
  }));

  router.post("/links/build", asyncRoute(async (req, res) => {
    res.json(await service.rebuild(req.body || {}));
  }));

  router.get("/links/graph", asyncRoute(async (req, res) => {
    res.json(await service.graph(req.query));
  }));

  return router;
}

module.exports = createRoutes;
