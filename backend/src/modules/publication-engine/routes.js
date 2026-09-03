"use strict";
const express = require("express");
const { createPublicationService } = require("./service");

module.exports = function createPublicationRoutes(prisma) {
  const router = express.Router();
  const service = createPublicationService(prisma);
  router.get("/publication/health", (_req, res) => res.json({ ok: true, version: "1.0.0", capability: "publication-engine" }));
  router.get("/publication/pages/:pageId", async (req, res, next) => { try {
    const [page, versions, events, schedules] = await Promise.all([
      service.loadPage(req.params.pageId),
      prisma.pagePublicationVersion.findMany({ where: { pageId: req.params.pageId }, orderBy: { version: "desc" }, select: { id: true, version: true, status: true, checksum: true, actor: true, reason: true, source: true, createdAt: true } }),
      prisma.pagePublicationEvent.findMany({ where: { pageId: req.params.pageId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.pagePublicationSchedule.findMany({ where: { pageId: req.params.pageId }, orderBy: { scheduledAt: "desc" } }),
    ]);
    res.json({ ok: true, page, versions, events, schedules });
  } catch (e) { next(e); } });
  router.get("/publication/pages/:pageId/audit", async (req, res, next) => { try { res.json({ ok: true, audit: await service.audit(req.params.pageId, { baseUrl: req.query.baseUrl }) }); } catch (e) { next(e); } });
  router.post("/publication/pages/:pageId/review", async (req, res, next) => { try { res.json({ ok: true, result: await service.transition(req.params.pageId, "review", req.body || {}) }); } catch (e) { next(e); } });
  router.post("/publication/pages/:pageId/publish", async (req, res, next) => { try { res.json({ ok: true, result: await service.transition(req.params.pageId, "published", req.body || {}) }); } catch (e) { next(e); } });
  router.post("/publication/pages/:pageId/unpublish", async (req, res, next) => { try { res.json({ ok: true, result: await service.transition(req.params.pageId, "unpublished", req.body || {}) }); } catch (e) { next(e); } });
  router.post("/publication/pages/:pageId/archive", async (req, res, next) => { try { res.json({ ok: true, result: await service.transition(req.params.pageId, "archived", req.body || {}) }); } catch (e) { next(e); } });
  router.post("/publication/pages/:pageId/rollback/:version", async (req, res, next) => { try { res.json({ ok: true, result: await service.rollback(req.params.pageId, req.params.version, req.body || {}) }); } catch (e) { next(e); } });
  router.post("/publication/pages/:pageId/schedule", async (req, res, next) => { try { res.status(201).json({ ok: true, schedule: await service.schedule(req.params.pageId, req.body || {}) }); } catch (e) { next(e); } });
  router.delete("/publication/schedules/:id", async (req, res, next) => { try { const schedule = await prisma.pagePublicationSchedule.update({ where: { id: req.params.id }, data: { status: "cancelled" } }); res.json({ ok: true, schedule }); } catch (e) { next(e); } });
  router.post("/publication/schedules/run-due", async (req, res, next) => { try { res.json({ ok: true, summary: await service.runDue(req.body || {}) }); } catch (e) { next(e); } });
  return router;
};
