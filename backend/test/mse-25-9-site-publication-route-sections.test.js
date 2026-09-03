"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 site publication client targets the internal publish route", () => {
  const client = read("backend/src/modules/site-publication/page-publication-client.js");

  assert.match(client, /\/publication\/pages\//);
  assert.match(client, /`\/\$\{action\}`|`\/\$\{action\}`/);
  assert.match(client, /action:\s*["']publish["']/);
  assert.match(client, /action:\s*["']unpublish["']/);
});

test("MSE-25.9 internal page publication routes delegate to the section-aware repository lifecycle", () => {
  const routes = read("backend/src/modules/site-publication/routes.js");

  assert.match(routes, /["']\/publication\/pages\/:pageId\/publish["']/);
  assert.match(routes, /repository\.markPagePublished\(\{/);
  assert.match(routes, /["']\/publication\/pages\/:pageId\/unpublish["']/);
  assert.match(routes, /repository\.markPageUnpublished\(\{/);
  assert.match(routes, /await assertSiteInTenant\(prisma, request, siteId\)/);
});

test("MSE-25.9 publication repository promotes Designer sections transactionally", () => {
  const repository = read("backend/src/modules/site-publication/repository.js");

  assert.match(repository, /this\.prisma\.\$transaction/);
  assert.match(repository, /tx\.agencySiteSection\.updateMany/);
  assert.match(repository, /status:\s*\{\s*not:\s*["']hidden["']\s*\}/);
  assert.match(repository, /sectionsPublished/);
  assert.match(repository, /sectionsUnpublished/);
});
