"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  PublishRollbackRepository,
  isPublishedSite,
} = require("../src/modules/site-publication/publish-rollback-repository");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 recognises every supported live site state", () => {
  assert.equal(isPublishedSite({ status: "published" }), true);
  assert.equal(isPublishedSite({ published: true }), true);
  assert.equal(isPublishedSite({ isPublished: true }), true);
  assert.equal(isPublishedSite({ publishedAt: new Date() }), true);
  assert.equal(isPublishedSite({ status: "draft", publishedAt: null }), false);
});

test("MSE-25.9 failed republish never marks an already live site as draft", async () => {
  let unpublished = false;
  const base = {
    site: async () => ({
      id: "site-1",
      status: "published",
      publishedAt: new Date("2026-08-11T08:00:00.000Z"),
      pages: [],
    }),
    markSiteUnpublished: async () => {
      unpublished = true;
      return { id: "site-1", status: "draft" };
    },
  };

  const repository = new PublishRollbackRepository(base);
  await repository.site("site-1");
  const result = await repository.markSiteUnpublished("site-1");

  assert.equal(unpublished, false);
  assert.equal(result.status, "published");
  assert.equal(result.preserved, true);
});

test("MSE-25.9 first publication rollback still restores an unpublished site", async () => {
  let unpublished = false;
  const base = {
    site: async () => ({
      id: "site-1",
      status: "draft",
      publishedAt: null,
      pages: [],
    }),
    markSiteUnpublished: async () => {
      unpublished = true;
      return { id: "site-1", status: "draft" };
    },
  };

  const repository = new PublishRollbackRepository(base);
  await repository.site("site-1");
  const result = await repository.markSiteUnpublished("site-1");

  assert.equal(unpublished, true);
  assert.equal(result.status, "draft");
});

test("MSE-25.9 publish route uses rollback-safe service while explicit unpublish uses normal service", () => {
  const routes = source("backend/src/modules/site-publication/routes.js");

  assert.match(routes, /new PublishRollbackRepository\(repository\)/);
  assert.match(routes, /const result = await publishService\.publish\(/);
  assert.match(routes, /await service\.unpublish\(/);
});
