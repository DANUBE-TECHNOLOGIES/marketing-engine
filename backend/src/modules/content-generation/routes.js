"use strict";
const express = require("express");
const { ContentGenerationService } = require("./service");

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = req => new ContentGenerationService(prisma, req.tenantId);
  router.get("/generation/health", (req, res) => res.json(service(req).health()));
  router.get("/generation/jobs", async (req, res, next) => { try { res.json(await service(req).list(req.query)); } catch (e) { next(e); } });
  router.post("/generation/jobs", async (req, res, next) => { try { res.status(202).json(await service(req).create(req.body || {})); } catch (e) { next(e); } });
  router.get("/generation/jobs/:id", async (req, res, next) => { try { res.json(await service(req).get(req.params.id)); } catch (e) { next(e); } });
  router.post("/generation/jobs/:id/run", async (req, res, next) => { try { res.json(await service(req).run(req.params.id)); } catch (e) { next(e); } });
  router.post("/generation/jobs/:id/cancel", async (req, res, next) => { try { res.json(await service(req).cancel(req.params.id)); } catch (e) { next(e); } });
  return router;
};
