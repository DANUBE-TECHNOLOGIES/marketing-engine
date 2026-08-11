"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  normalizeEditorialTargeting,
  contentTargetsAgency,
} = require("../src/modules/ai-content/editorial-targeting");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 normalizes network and agency editorial targeting", () => {
  assert.deepEqual(normalizeEditorialTargeting({ scope: "network", agencyIds: ["3"] }), {
    scope: "network",
    agencyIds: [],
  });

  assert.deepEqual(normalizeEditorialTargeting({ scope: "agencies", agencyIds: [3, "6", "3"] }), {
    scope: "agencies",
    agencyIds: ["3", "6"],
  });

  assert.throws(
    () => normalizeEditorialTargeting({ scope: "agencies", agencyIds: [] }),
    (error) => error?.code === "AI_CONTENT_TARGET_AGENCY_REQUIRED"
  );
});

test("MSE-25.9 treats legacy content as network-wide and filters local content", () => {
  assert.equal(contentTargetsAgency({ seo: {} }, 9), true);
  assert.equal(contentTargetsAgency({
    seo: { editorialTargeting: { scope: "agencies", agencyIds: ["3", "6"] } },
  }, 3), true);
  assert.equal(contentTargetsAgency({
    seo: { editorialTargeting: { scope: "agencies", agencyIds: ["3", "6"] } },
  }, 9), false);
});

test("MSE-25.9 public routes and clients propagate the agency scope", () => {
  const aiRoutes = source("backend/src/modules/ai-content/routes.js");
  const publicRoutes = source("backend/src/modules/public-site-read/routes.js");
  const proxyList = source("frontend/app/api/website-builder/inspirations/route.js");
  const proxyDetail = source("frontend/app/api/website-builder/inspirations/[contentSlug]/route.js");
  const client = source("frontend/lib/public-site-api.js");

  assert.match(aiRoutes, /agencyId/);
  assert.match(publicRoutes, /filterAgencyInspirations/);
  assert.match(publicRoutes, /editorialTargeting:\s*"agency-aware"/);
  assert.match(proxyList, /"agencyId"/);
  assert.match(proxyDetail, /searchParams\.set\("agencyId"/);
  assert.match(client, /getInspiration\(siteSlug, contentSlug\)/);
  assert.match(client, /site\?\.agencyId \|\| site\?\.agency\?\.id/);
});
