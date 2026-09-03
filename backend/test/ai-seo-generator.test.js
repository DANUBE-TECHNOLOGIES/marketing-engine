"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { AiSeoGeneratorService } = require("../src/modules/ai-seo-generator/service");

const campaign = {
  id: "c1",
  name: "Soleil d'hiver",
  destinations: [{ destination: { id: "d1", slug: "ile-maurice", name: "Île Maurice", country: "Maurice" } }],
  agencies: [{ agency: { id: 1, name: "Mondescale Bois-Colombes", city: "Bois-Colombes", phone: "01 23 45 67 89" } }],
};
const task = { id: "t1", type: "seo", channel: "landing-page", payload: { destinationId: "d1" } };

test("génère une landing page SEO structurée", async () => {
  const asset = await new AiSeoGeneratorService().generate(task, { campaign });
  assert.equal(asset.campaignId, "c1");
  assert.equal(asset.taskId, "t1");
  assert.equal(asset.status, "review");
  assert.match(asset.payload.h1, /Île Maurice/);
  assert.ok(asset.metadata.seo.title.length <= 60);
  assert.ok(asset.metadata.seo.description.length <= 155);
  assert.equal(asset.metadata.schema["@context"], "https://schema.org");
});

test("génère une FAQ et son JSON-LD", async () => {
  const asset = await new AiSeoGeneratorService().generate({ ...task, id: "t2", channel: "faq" }, { campaign });
  assert.equal(asset.type, "faq");
  assert.equal(asset.payload.items.length, 4);
  assert.equal(asset.metadata.schema["@type"], "FAQPage");
  assert.equal(asset.metadata.schema.mainEntity.length, 4);
});

test("accepte un fournisseur externe injectable", async () => {
  const provider = { generate: async () => ({ type: "landing-page", title: "Titre fournisseur", payload: { h1: "H1 externe" }, metadata: { model: "test" } }) };
  const asset = await new AiSeoGeneratorService({ provider }).generate(task, { campaign });
  assert.equal(asset.title, "Titre fournisseur");
  assert.equal(asset.metadata.model, "test");
});

test("refuse une tâche invalide", async () => {
  await assert.rejects(() => new AiSeoGeneratorService().generate({}, { campaign }), /Tâche/);
});
