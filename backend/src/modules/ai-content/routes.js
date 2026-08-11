"use strict";
const express = require("express");
const { AiContentService, toInspiration } = require("./service");
const {
  resolveEditorialCanonical,
} = require("./editorial-canonical");
const {
  validateEditorialUpdate,
  assertEditorialTargetingAgenciesBelongToTenant,
  assertEditableEditorialContent,
} = require("./editorial-update");

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function publicCatalogFilters(query = {}) {
  const ids = String(query.ids || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 100);

  return {
    ids,
    channel: String(query.channel || "").trim() || undefined,
    agencyId: String(query.agencyId || "").trim() || undefined,
    limit: Math.min(Math.max(Number(query.limit) || 24, 1), 100),
  };
}

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = req => new AiContentService(prisma, req.tenant.id);

  router.get("/ai-content/health", (req, res) => res.json(service(req).health()));
  router.get("/ai-content/published", async (req, res, next) => {
    try {
      const current = service(req);
      const filters = publicCatalogFilters(req.query);
      const contents = await current.repo.listPublishedContents(filters);
      const items = contents.map(toInspiration);

      if (!filters.ids.length) {
        return res.json({ items, count: items.length });
      }

      const byId = new Map(items.map((item) => [String(item.id), item]));
      const bySlug = new Map(items.filter((item) => item.slug).map((item) => [String(item.slug), item]));
      const ordered = filters.ids
        .map((id) => byId.get(String(id)) || bySlug.get(String(id)))
        .filter(Boolean)
        .slice(0, filters.limit);

      return res.json({ items: ordered, count: ordered.length });
    } catch (e) { return next(e); }
  });
  router.get("/ai-content/published/:slug", async (req, res, next) => {
    try {
      const current = service(req);
      const content = await current.repo.getPublishedContentBySlug(req.params.slug, {
        agencyId: String(req.query.agencyId || "").trim() || undefined,
      });
      if (!content) {
        return res.status(404).json({
          error: "AI_CONTENT_PUBLISHED_NOT_FOUND",
          message: "Inspiration publiée introuvable.",
        });
      }

      const editorialCanonical = await resolveEditorialCanonical(
        prisma,
        req.tenant.id,
        content
      );

      return res.json({
        ...content,
        editorialCanonical,
      });
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
        await assertEditorialTargetingAgenciesBelongToTenant(
          prisma,
          req.tenant.id,
          editorialTargeting
        );
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