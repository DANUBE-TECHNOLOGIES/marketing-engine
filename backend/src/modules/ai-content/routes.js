"use strict";
const express = require("express");
const { AiContentService } = require("./service");
const {
  validateEditorialUpdate,
  assertEditableEditorialContent,
} = require("./editorial-update");

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = req => new AiContentService(prisma, req.tenant.id);

  router.get("/ai-content/health", (req, res) => res.json(service(req).health()));
  router.get("/ai-content/published", async (req, res, next) => {
    try { res.json(await service(req).listPublished(req.query)); } catch (e) { next(e); }
  });
  router.get("/ai-content/published/:slug", async (req, res, next) => {
    try {
      const current = service(req);
      const content = await current.repo.getPublishedContentBySlug(req.params.slug);
      if (!content) {
        return res.status(404).json({
          error: "AI_CONTENT_PUBLISHED_NOT_FOUND",
          message: "Inspiration publiée introuvable.",
        });
      }
      return res.json(content);
    } catch (e) { return next(e); }
  });
  router.get("/ai-content/contents", async (req, res, next) => {
    try {
      const current = service(req);
      res.json(await current.repo.listContents(req.query));
    } catch (e) { next(e); }
  });
  router.get("/ai-content/contents/:id", async (req, res, next) => {
    try { res.json(await service(req).getContent(req.params.id)); } catch (e) { next(e); }
  });
  router.patch("/ai-content/contents/:id", async (req, res, next) => {
    try {
      const current = service(req);
      const content = await current.getContent(req.params.id);
      assertEditableEditorialContent(content);
      const patch = validateEditorialUpdate(req.body);
      const editorialTargeting = patch.editorialTargeting;
      delete patch.editorialTargeting;

      if (editorialTargeting) {
        patch.seo = {
          ...asObject(content.seo),
          editorialTargeting,
        };
      }

      res.json(await current.repo.updateContent(content.id, patch));
    } catch (e) { next(e); }
  });
  router.get("/ai-content/jobs", async (req, res, next) => {
    try { res.json(await service(req).list(req.query)); } catch (e) { next(e); }
  });
  router.get("/ai-content/jobs/:id", async (req, res, next) => {
    try { res.json(await service(req).get(req.params.id)); } catch (e) { next(e); }
  });
  router.post("/ai-content/preview", async (req, res, next) => {
    try { res.json(await service(req).preview(req.body)); } catch (e) { next(e); }
  });
  router.post("/ai-content/generate", async (req, res, next) => {
    try { res.status(201).json(await service(req).generate(req.body)); } catch (e) { next(e); }
  });
  router.post("/ai-content/jobs/:id/retry", async (req, res, next) => {
    try { res.json(await service(req).retry(req.params.id)); } catch (e) { next(e); }
  });
  router.post("/ai-content/contents/:id/publish", async (req, res, next) => {
    try { res.json(await service(req).publishContent(req.params.id)); } catch (e) { next(e); }
  });
  router.post("/ai-content/contents/:id/unpublish", async (req, res, next) => {
    try { res.json(await service(req).unpublishContent(req.params.id)); } catch (e) { next(e); }
  });

  return router;
};
