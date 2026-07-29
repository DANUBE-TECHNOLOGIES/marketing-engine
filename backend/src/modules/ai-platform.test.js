"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const sdk = require("../sdk");
const Knowledge = require("./ai-platform/knowledge-connector");
const Prompt = require("./ai-platform/prompt-engine");
const Pipeline = require("./ai-platform/ai-pipeline");
const Composer = require("./ai-platform/content-composer");

test("normalize knowledge", () => {
  assert.equal(Knowledge.normalize({ title: "Budapest" }).name, "Budapest");
});
test("build layered prompt", () => {
  const result = Prompt.create({ sdk }).build({ topic: "Budapest" });
  assert.equal(result.sections.length, 4);
});
test("pipeline", async () => {
  const promptEngine = Prompt.create({ sdk });
  const pipeline = Pipeline.create({ sdk, promptEngine });
  const result = await pipeline.run({ topic: "Budapest" });
  assert.equal(result.status, "completed");
});
test("composer fallback", async () => {
  const knowledge = Knowledge.create({ prisma: null, sdk });
  const promptEngine = Prompt.create({ sdk });
  const pipeline = Pipeline.create({ sdk, promptEngine });
  const composer = Composer.create({ sdk, knowledge, pipeline });
  const result = await composer.compose({ topic: "Budapest" });
  assert.equal(result.content.title, "Découvrir Budapest");
});
