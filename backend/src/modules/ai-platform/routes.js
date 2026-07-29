"use strict";
const express = require("express");
const sdk = require("../../sdk");
const Knowledge = require("./knowledge-connector");
const Prompt = require("./prompt-engine");
const Pipeline = require("./ai-pipeline");
const Composer = require("./content-composer");

module.exports = ({ prisma }) => {
  const router = express.Router();
  const knowledge = Knowledge.create({ prisma, sdk });
  const promptEngine = Prompt.create({ sdk });
  const pipeline = Pipeline.create({ sdk, promptEngine });
  const composer = Composer.create({ sdk, knowledge, pipeline });

  const services = [
    ["knowledge.connector", knowledge, ["graph.entity.read"]],
    ["prompt.engine", promptEngine, ["prompt.list", "prompt.build"]],
    ["ai.pipeline", pipeline, ["ai.pipeline.run", "content.generate"]],
    ["content.composer.v2", composer, ["content.compose"]]
  ];
  for (const [name, service, capabilities] of services) {
    if (!sdk.registry.describe().some(x => x.name === name)) {
      sdk.registry.register(name, service, { version: "1.0.0", domain: "content", capabilities });
    }
  }

  router.get("/ai-platform/health", (_req, res) => res.json({ ok: true, version: "0.11.0", provider: pipeline.provider }));
  router.get("/prompt-engine/prompts", (_req, res) => res.json({ prompts: promptEngine.list() }));
  router.post("/prompt-engine/build", (req, res, next) => {
    try { res.json(promptEngine.build(req.body?.context || {}, req.body?.options || {})); } catch (e) { next(e); }
  });
  router.get("/knowledge-connector/entities/:identifier", async (req, res, next) => {
    try {
      const entity = await knowledge.getEntity(req.params.identifier);
      if (!entity) return res.status(404).json({ error: "ENTITY_NOT_FOUND" });
      res.json(entity);
    } catch (e) { next(e); }
  });
  router.post("/ai-pipeline/run", async (req, res, next) => {
    try {
      const result = await pipeline.run(req.body?.context || {}, req.body?.options || {});
      res.status(result.status === "completed" ? 200 : 422).json(result);
    } catch (e) { next(e); }
  });
  router.get("/content-composer/health", (_req, res) => res.json({ ok: true, version: "2.0.0" }));
  router.post("/content-composer/compose", async (req, res, next) => {
    try {
      const result = await composer.compose(req.body || {});
      res.status(result.pipeline.status === "completed" ? 200 : 422).json(result);
    } catch (e) { next(e); }
  });
  return router;
};
