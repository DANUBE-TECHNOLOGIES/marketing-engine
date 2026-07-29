"use strict";
const express = require("express");
const sdk = require("../../sdk");
const SeoFactory = require("./service");

module.exports = () => {
  const router = express.Router();
  const service = SeoFactory.create({ sdk });

  if (!sdk.registry.describe().some(item => item.name === "seo.factory.v2")) {
    sdk.registry.register("seo.factory.v2", service, {
      version: "1.0.0",
      domain: "seo",
      capabilities: [
        "seo.plan",
        "seo.internal-links",
        "seo.schema",
        "seo.score",
        "seo.factory.build"
      ]
    });
  }

  router.get("/seo-platform/health", (_req, res) => {
    res.json({ ok: true, version: "0.12.0" });
  });

  router.post("/seo-platform/plan", (req, res, next) => {
    try { res.json(service.plan(req.body || {})); } catch (error) { next(error); }
  });

  router.post("/seo-platform/links", (req, res, next) => {
    try { res.json(service.buildLinks(req.body?.plan || {}, req.body?.options || {})); }
    catch (error) { next(error); }
  });

  router.post("/seo-platform/schema", (req, res, next) => {
    try { res.json(service.generateSchema(req.body || {})); } catch (error) { next(error); }
  });

  router.post("/seo-platform/score", (req, res, next) => {
    try { res.json(service.score(req.body || {})); } catch (error) { next(error); }
  });

  router.post("/seo-platform/factory", (req, res, next) => {
    try { res.json(service.buildFactory(req.body || {})); } catch (error) { next(error); }
  });

  return router;
};
