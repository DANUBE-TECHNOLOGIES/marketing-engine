"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const DestinationRepository = require("../src/modules/destination-engine/repository");
const DestinationService = require("../src/modules/destination-engine/service");
const destinationRoutes = require("../src/modules/destination-engine/routes");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function request(headers = {}, extras = {}) {
  return {
    ...extras,
    get(name) {
      return headers[String(name).toLowerCase()] || null;
    },
  };
}

test("MSE-25.9 public destination site lookup combines tenant and slug", async () => {
  let captured = null;
  const prisma = {
    agencySite: {
      findFirst: async (args) => {
        captured = args;
        return null;
      },
    },
  };

  const repository = new DestinationRepository(prisma);
  await repository.findPublicSite("bois-colombes", "tenant-mondescale");

  assert.deepEqual(captured.where, {
    slug: "bois-colombes",
    tenantId: "tenant-mondescale",
  });
});

test("MSE-25.9 public destination service requires tenant before site lookup", async () => {
  let siteLookup = false;
  const prisma = {};
  const service = new DestinationService(prisma);
  service.repo = {
    findPublicSite: async () => {
      siteLookup = true;
      return null;
    },
  };
  service.publicRepo = {
    findPublishedForTenant: async () => null,
  };

  await assert.rejects(
    () => service.publicForSite("bois-colombes", "sicile", ""),
    (error) => error?.code === "PUBLIC_DESTINATION_TENANT_REQUIRED"
  );
  assert.equal(siteLookup, false);
});

test("MSE-25.9 public destination route resolves x-tenant-slug", async () => {
  let captured = null;
  const prisma = {
    tenant: {
      findUnique: async (args) => {
        captured = args;
        return { id: "tenant-mondescale" };
      },
    },
  };

  const tenantId = await destinationRoutes.publicTenantId(
    prisma,
    request({ "x-tenant-slug": "mondescale" })
  );

  assert.equal(tenantId, "tenant-mondescale");
  assert.deepEqual(captured.where, { slug: "mondescale" });
});

test("MSE-25.9 destination frontend sends deployment tenant", () => {
  const client = source("frontend/lib/destination-api.js");

  assert.match(client, /process\.env\.TENANT_SLUG/);
  assert.match(client, /process\.env\.NEXT_PUBLIC_TENANT_SLUG/);
  assert.match(client, /['"]x-tenant-slug['"]:\s*TENANT_SLUG/);
});
