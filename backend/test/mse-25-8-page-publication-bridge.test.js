"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(
    path.join(__dirname, "..", relativePath),
    "utf8"
  );
}

test("MSE-25.8 exposes the page publication endpoints expected by the orchestrator", () => {
  const routes = read("src/modules/site-publication/routes.js");
  const client = read("src/modules/site-publication/page-publication-client.js");

  assert.match(
    client,
    /\/publication\/pages\/\$\{encodeURIComponent\(pageId\)\}\/publish/
  );
  assert.match(
    client,
    /\/publication\/pages\/\$\{encodeURIComponent\(pageId\)\}\/unpublish/
  );

  assert.match(
    routes,
    /"\/publication\/pages\/:pageId\/publish"/
  );
  assert.match(
    routes,
    /"\/publication\/pages\/:pageId\/unpublish"/
  );
  assert.match(routes, /await assertSiteInTenant\(prisma, request, siteId\)/);
  assert.match(routes, /repository\.markPagePublished\(\{/);
  assert.match(routes, /repository\.markPageUnpublished\(\{/);
});

test("MSE-25.8 page publication state writes are scoped to the requested site", () => {
  const repository = read("src/modules/site-publication/repository.js");

  assert.match(repository, /async markPagePublished\(\{/);
  assert.match(repository, /async markPageUnpublished\(\{/);
  assert.match(repository, /id: String\(pageId\),\s*siteId: String\(siteId\)/s);
  assert.match(repository, /status: "published",\s*published: true/s);
  assert.match(repository, /status: "draft",\s*published: false/s);
});
