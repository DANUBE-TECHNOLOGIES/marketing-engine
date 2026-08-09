"use strict";
const express = require("express");
const { AiContentService } = require("./service");

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = req => new AiContentService(prisma, req.tenant.id);
  router.get("/ai-content/health", (req, res) => res.json(service(req).health()));
  router.get("/ai-content/published", async (req, res, next) => { try { res.json(await service(req).listPublished(req.query)); } catch (e) { next(e); } });
  router.get("/ai-content/jobs", async (req, res, next) => { try { res.json(await service(req).list(req.query)); } catch (e) { next(e); } });
  router.get("/ai-content/jobs/:id", async (req, res, next) => { try { res.json(await service(req).get(req.params.id)); } catch (e) { next(e); } });
  router.post("/ai-content/preview", async (req, res, next) => { try { res.json(await service(req).preview(req.body)); } catch (e) { next(e); } });
  router.post("/ai-content/generate", async (req, res, next) => { try { res.status(201).json(await service(req).generate(req.body)); } catch (e) { next(e); } });
  router.post("/ai-content/jobs/:id/retry", async (req, res, next) => { try { res.json(await service(req).retry(req.params.id)); } catch (e) { next(e); } });
  router.post("/ai-content/contents/:id/publish", async (req, res, next) => { try { res.json(await service(req).publishContent(req.params.id)); } catch (e) { next(e); } });
  router.post("/ai-content/contents/:id/unpublish", async (req, res, next) => { try { res.json(await service(req).unpublishContent(req.params.id)); } catch (e) { next(e); } });
  return router;
};
