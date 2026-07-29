"use strict";

const express = require("express");
const { JobRegistry } = require("./registry");
const { registerCoreHandlers } = require("./handlers");
const { createJobsService } = require("./service");

module.exports = function createJobsRoutes(prisma) {
  const router = express.Router();
  const registry = registerCoreHandlers(new JobRegistry(), prisma);
  const service = createJobsService(prisma, registry);

  router.get("/jobs/health", async (_req, res, next) => { try {
    const counts = await prisma.backgroundJob.groupBy({ by: ["status"], _count: { _all: true } });
    res.json({ ok: true, version: "1.0.0", capability: "jobs-engine", workerId: service.workerId, handlers: registry.list(), counts });
  } catch (error) { next(error); } });

  router.get("/jobs", async (req, res, next) => { try {
    const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.type) where.type = String(req.query.type);
    const jobs = await prisma.backgroundJob.findMany({ where, orderBy: { createdAt: "desc" }, take });
    res.json({ ok: true, jobs });
  } catch (error) { next(error); } });

  router.get("/jobs/:id", async (req, res, next) => { try {
    const job = await prisma.backgroundJob.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ ok: false, error: "Job introuvable." });
    res.json({ ok: true, job });
  } catch (error) { next(error); } });

  router.post("/jobs", async (req, res, next) => { try {
    const result = await service.enqueue(req.body || {});
    res.status(result.deduplicated ? 200 : 201).json({ ok: true, ...result });
  } catch (error) { next(error); } });

  router.post("/jobs/run-due", async (req, res, next) => { try { res.json({ ok: true, summary: await service.runDue(req.body || {}) }); } catch (error) { next(error); } });
  router.post("/jobs/:id/retry", async (req, res, next) => { try { res.json({ ok: true, job: await service.retry(req.params.id) }); } catch (error) { next(error); } });
  router.post("/jobs/:id/cancel", async (req, res, next) => { try { res.json({ ok: true, job: await service.cancel(req.params.id) }); } catch (error) { next(error); } });

  return router;
};
