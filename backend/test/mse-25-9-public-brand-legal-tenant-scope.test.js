"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  findSiteBySlug,
  findSiteByAgencyId,
} = require("../src/modules/public-brand-legal/site-lookup");
const {
  resolvePublicBrandLegalTenantId,
} = require("../src/modules/public-brand-legal/routes");

function request(headers = {}, extras = {}) {
  return {
    ...extras,
    get(name) {
      return headers[String(name).toLowerCase()] || null;
    },
  };
}

test("MSE-25.9 brand legal site slug lookup is tenant scoped", async () => {
  let captured = null;
  const prisma = {
    agencySite: {
      findFirst: async (args) => {
        captured = args;
        return {
          id: "site-6",
          agencyId: 6,
          tenantId: "tenant-mondescale",
          slug: "bois-colombes",
          agency: {
            id: 6,
            tenantId: "tenant-mondescale",
            name: "Mondescale Bois-Colombes",
          },
        };
      },
    },
  };

  await findSiteBySlug({
    prisma,
    siteSlug: "bois-colombes",
    tenantId: "tenant-mondescale",
  });

  assert.deepEqual(captured.where, {
    slug: "bois-colombes",
    tenantId: "tenant-mondescale",
  });
});

test("MSE-25.9 brand legal agency lookup is tenant scoped", async () => {
  let captured = null;
  const prisma = {
    agencySite: {
      findFirst: async (args) => {
        captured = args;
        return {
          id: "site-6",
          agencyId: 6,
          tenantId: "tenant-mondescale",
          slug: "bois-colombes",
          agency: {
            id: 6,
            tenantId: "tenant-mondescale",
            name: "Mondescale Bois-Colombes",
          },
        };
      },
    },
  };

  await findSiteByAgencyId({
    prisma,
    agencyId: 6,
    tenantId: "tenant-mondescale",
  });

  assert.equal(captured.where.agencyId, 6);
  assert.equal(captured.where.tenantId, "tenant-mondescale");
});

test("MSE-25.9 brand legal runtime resolves tenant slug from request", async () => {
  let captured = null;
  const database = {
    tenant: {
      findUnique: async (args) => {
        captured = args;
        return { id: "tenant-mondescale" };
      },
    },
  };

  const tenantId = await resolvePublicBrandLegalTenantId(
    database,
    request({ "x-tenant-slug": "mondescale" })
  );

  assert.equal(tenantId, "tenant-mondescale");
  assert.deepEqual(captured.where, { slug: "mondescale" });
});

test("MSE-25.9 brand legal lookup fails closed without tenant", async () => {
  const prisma = {
    agencySite: {
      findFirst: async () => {
        throw new Error("should not query");
      },
    },
  };

  await assert.rejects(
    () => findSiteBySlug({
      prisma,
      siteSlug: "bois-colombes",
      tenantId: "",
    }),
    (error) => error?.code === "PUBLIC_BRAND_LEGAL_TENANT_REQUIRED"
  );
});
