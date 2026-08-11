"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SectionAwarePublicSiteReadService,
} = require("../src/modules/public-site-read/section-aware-service");
const {
  resolvePublicTenantId,
} = require("../src/modules/public-site-read/routes");
const {
  resolvePreviewSiteContext,
} = require("../src/modules/public-site-read/preview-hydrator");

function request(headers = {}, extras = {}) {
  return {
    ...extras,
    get(name) {
      return headers[String(name).toLowerCase()] || null;
    },
  };
}

test("MSE-25.9 resolves the public tenant from middleware before headers", async () => {
  let queried = false;
  const database = {
    tenant: {
      findUnique: async () => {
        queried = true;
        return null;
      },
    },
  };

  const tenantId = await resolvePublicTenantId(
    database,
    request({ "x-tenant-slug": "other" }, { tenant: { id: "tenant-mondescale", slug: "mondescale" } })
  );

  assert.equal(tenantId, "tenant-mondescale");
  assert.equal(queried, false);
});

test("MSE-25.9 resolves x-tenant-slug to a tenant id", async () => {
  let captured = null;
  const database = {
    tenant: {
      findUnique: async (args) => {
        captured = args;
        return { id: "tenant-mondescale" };
      },
    },
  };

  const tenantId = await resolvePublicTenantId(
    database,
    request({ "x-tenant-slug": "mondescale" })
  );

  assert.equal(tenantId, "tenant-mondescale");
  assert.deepEqual(captured.where, { slug: "mondescale" });
});

test("MSE-25.9 public renderer scopes duplicate site slugs by tenant", async () => {
  let captured = null;
  const prisma = {
    agencySite: {
      findFirst: async (args) => {
        captured = args;
        return {
          id: "site-1",
          agencyId: 6,
          tenantId: "tenant-mondescale",
          slug: "bois-colombes",
          name: "Mondescale Bois-Colombes",
          status: "published",
          publishedAt: new Date("2026-08-11T08:00:00.000Z"),
          agency: {
            id: 6,
            tenantId: "tenant-mondescale",
            name: "Mondescale Bois-Colombes",
          },
          pages: [],
        };
      },
    },
  };

  const service = new SectionAwarePublicSiteReadService({ prisma });
  const contract = await service.bySlug("bois-colombes", "tenant-mondescale");

  assert.deepEqual(captured.where, {
    slug: "bois-colombes",
    tenantId: "tenant-mondescale",
  });
  assert.equal(contract.site.tenantId, "tenant-mondescale");
});

test("MSE-25.9 public renderer fails closed without tenant context", async () => {
  const prisma = {
    agencySite: {
      findFirst: async () => {
        throw new Error("should not query");
      },
    },
  };

  const service = new SectionAwarePublicSiteReadService({ prisma });

  await assert.rejects(
    () => service.bySlug("bois-colombes", ""),
    (error) => error?.code === "PUBLIC_SITE_TENANT_REQUIRED" && error?.statusCode === 400
  );
});

test("MSE-25.9 preview hydration scopes site lookup by tenant", async () => {
  let captured = null;
  const prisma = {
    agencySite: {
      findFirst: async (args) => {
        captured = args;
        return {
          id: "site-1",
          agencyId: 6,
          tenantId: "tenant-mondescale",
          agency: { tenantId: "tenant-mondescale" },
        };
      },
    },
  };

  const context = await resolvePreviewSiteContext({
    prisma,
    siteSlug: "bois-colombes",
    tenantId: "tenant-mondescale",
  });

  assert.deepEqual(captured.where, {
    slug: "bois-colombes",
    tenantId: "tenant-mondescale",
  });
  assert.equal(context.siteId, "site-1");
});
