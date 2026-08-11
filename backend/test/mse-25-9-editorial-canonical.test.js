"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  resolveEditorialCanonical,
} = require("../src/modules/ai-content/editorial-canonical");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 resolves the published canonical agency site inside the current tenant", async () => {
  const calls = [];
  const prisma = {
    agencySite: {
      findFirst: async (args) => {
        calls.push(args);
        return { agencyId: 6, slug: "bois-colombes", name: "Mondescale Bois-Colombes" };
      },
    },
  };

  const canonical = await resolveEditorialCanonical(prisma, "tenant-mondescale", {
    seo: {
      editorialTargeting: {
        scope: "agencies",
        agencyIds: ["3", "6"],
        indexAgencyId: "6",
      },
    },
  });

  assert.deepEqual(canonical, {
    agencyId: "6",
    siteSlug: "bois-colombes",
    siteName: "Mondescale Bois-Colombes",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].where.tenantId, "tenant-mondescale");
  assert.equal(calls[0].where.agencyId, 6);
  assert.deepEqual(calls[0].where.OR, [
    { status: "published" },
    { publishedAt: { not: null } },
  ]);
});

test("MSE-25.9 does not create a canonical owner for network editorials", async () => {
  let queried = false;
  const prisma = {
    agencySite: {
      findFirst: async () => {
        queried = true;
        return null;
      },
    },
  };

  const canonical = await resolveEditorialCanonical(prisma, "tenant-mondescale", {
    seo: {
      editorialTargeting: {
        scope: "network",
        agencyIds: [],
        indexAgencyId: null,
      },
    },
  });

  assert.equal(canonical, null);
  assert.equal(queried, false);
});

test("MSE-25.9 public inspiration metadata canonicalizes copies to the index owner", () => {
  const routes = source("backend/src/modules/ai-content/routes.js");
  const page = source("frontend/app/agence/[siteSlug]/inspiration/[contentSlug]/page.js");

  assert.match(routes, /resolveEditorialCanonical/);
  assert.match(routes, /editorialCanonical/);
  assert.match(page, /canonicalSiteSlug/);
  assert.match(page, /content\?\.editorialCanonical/);
  assert.match(page, /canonicalPath\(canonicalOwnerSlug, contentSlug\)/);
  assert.match(page, /robots:\s*\{[\s\S]*index:\s*indexOwner/);
  assert.match(page, /openGraph:[\s\S]*url:\s*`\$\{PUBLIC_ORIGIN\}\$\{canonical\}`/);
  assert.match(page, /canonicalPublisherName/);
  assert.match(page, /editorialCanonical\?\.siteName/);
  assert.match(page, /mainEntityOfPage:\s*canonical/);
});
