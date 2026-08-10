"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const AiContentRepository = require("../src/modules/ai-content/repository");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 editorial listing remains tenant scoped", async () => {
  let captured = null;

  const prisma = {
    seoContent: {
      findMany: async (query) => {
        captured = query;
        return [];
      },
    },
  };

  const repository = new AiContentRepository(prisma, "tenant-mondescale");
  await repository.listContents({ status: "review", channel: "article", limit: 25 });

  assert.equal(captured.where.tenantId, "tenant-mondescale");
  assert.equal(captured.where.status, "review");
  assert.equal(captured.where.channel, "article");
  assert.equal(captured.take, 25);
});

test("MSE-25.9 published editorial catalog requires an actual publication timestamp", async () => {
  let captured = null;

  const prisma = {
    seoContent: {
      findMany: async (query) => {
        captured = query;
        return [];
      },
    },
  };

  const repository = new AiContentRepository(prisma, "tenant-mondescale");
  await repository.listPublishedContents({ channel: "article", limit: 6 });

  assert.equal(captured.where.tenantId, "tenant-mondescale");
  assert.equal(captured.where.status, "published");
  assert.deepEqual(captured.where.publishedAt, { not: null });
  assert.equal(captured.where.channel, "article");
});

test("MSE-25.9 exposes editorial review endpoints without auto-publishing generation", () => {
  const routes = read("backend/src/modules/ai-content/routes.js");
  const service = read("backend/src/modules/ai-content/service.js");

  assert.match(routes, /router\.get\(["']\/ai-content\/contents["']/);
  assert.match(routes, /router\.get\(["']\/ai-content\/contents\/:id["']/);
  assert.match(routes, /contents\/:id\/publish/);
  assert.match(routes, /contents\/:id\/unpublish/);

  assert.match(service, /status:\s*["']review["']/);
  assert.match(service, /async publishContent/);
  assert.doesNotMatch(service, /createContent\([\s\S]{0,400}status:\s*["']published["']/);
});

test("MSE-25.9 frontend provides a human-gated inspiration cockpit", () => {
  const cockpit = read("frontend/app/editorial-content/page.js");
  const admin = read("frontend/app/admin-network/page.js");

  assert.match(cockpit, /Studio éditorial Inspirations/);
  assert.match(cockpit, /generateInspiration/);
  assert.match(cockpit, /publishContent/);
  assert.match(cockpit, /unpublishContent/);
  assert.match(cockpit, /Le contenu généré arrive d’abord en validation/);
  assert.match(cockpit, /Relire le contenu généré/);
  assert.match(admin, /Studio éditorial Inspirations/);
  assert.match(admin, /\/editorial-content/);
});
