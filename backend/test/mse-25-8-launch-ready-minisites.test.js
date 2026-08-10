"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  tenantIdForRequest: launchTenantIdForRequest,
  assertAgencyInTenant,
} = require("../src/modules/agency-launch/routes");
const {
  requireTenantId,
} = require("../src/modules/minisite-structured-data/repository");
const {
  buildPublicSitemap,
} = require("../src/modules/minisite-structured-data/sitemap");
const {
  tenantIdForRequest: publicationTenantIdForRequest,
  assertSiteInTenant,
} = require("../src/modules/site-publication/routes");

function request({ tenantId, tenantSlug, headers = {} } = {}) {
  return {
    tenantId,
    tenantSlug,
    headers,
    get(name) {
      return headers[String(name).toLowerCase()] || "";
    },
  };
}

test("MSE-25.8 uses the resolved tenant id without database fallback", async () => {
  let lookedUp = false;
  const database = {
    tenant: {
      async findUnique() {
        lookedUp = true;
        return null;
      },
    },
  };

  const tenantId = await launchTenantIdForRequest(
    database,
    request({ tenantId: "tenant_mondescale" })
  );

  assert.equal(tenantId, "tenant_mondescale");
  assert.equal(lookedUp, false);
});

test("MSE-25.8 resolves x-tenant-slug to the real tenant id", async () => {
  const database = {
    tenant: {
      async findUnique(query) {
        assert.deepEqual(query, {
          where: { slug: "mondescale" },
          select: { id: true },
        });
        return { id: "tenant_mondescale" };
      },
    },
  };

  const tenantId = await launchTenantIdForRequest(
    database,
    request({ headers: { "x-tenant-slug": "mondescale" } })
  );

  assert.equal(tenantId, "tenant_mondescale");
});

test("MSE-25.8 rejects an agency outside the tenant", async () => {
  const database = {
    agency: {
      async findFirst(query) {
        assert.deepEqual(query, {
          where: { id: 42, tenantId: "tenant_mondescale" },
          select: { id: true },
        });
        return null;
      },
    },
  };

  await assert.rejects(
    () =>
      assertAgencyInTenant(
        database,
        "tenant_mondescale",
        42
      ),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, "AGENCY_LAUNCH_AGENCY_NOT_FOUND");
      return true;
    }
  );
});

test("MSE-25.8 accepts an agency belonging to the tenant", async () => {
  const database = {
    agency: {
      async findFirst() {
        return { id: 3 };
      },
    },
  };

  assert.equal(
    await assertAgencyInTenant(database, "tenant_mondescale", 3),
    3
  );
});

test("MSE-25.8 structured-data repository refuses an unscoped network query", () => {
  assert.throws(
    () => requireTenantId(""),
    (error) => {
      assert.equal(error.status, 400);
      assert.equal(error.code, "MINISITE_STRUCTURED_DATA_TENANT_REQUIRED");
      return true;
    }
  );
});

test("MSE-25.8 sitemap excludes draft sites, draft pages and legal noindex pages", () => {
  const sitemap = buildPublicSitemap({
    publicOrigin: "https://agences.mondescale.com",
    sites: [
      {
        id: "draft-site",
        slug: "draft-agency",
        status: "draft",
        pages: [
          { id: "draft-home", slug: "home", status: "published" },
        ],
      },
      {
        id: "live-site",
        slug: "live-agency",
        status: "published",
        pages: [
          { id: "home", slug: "home", status: "published" },
          { id: "agency", slug: "agence", published: true },
          { id: "draft-page", slug: "services", status: "draft" },
          { id: "legal", slug: "mentions-legales", status: "published" },
        ],
      },
    ],
  });

  const urls = sitemap.entries.map((entry) => entry.url);

  assert.equal(urls.some((url) => url.includes("draft-agency")), false);
  assert.equal(urls.some((url) => url.endsWith("/services")), false);
  assert.equal(urls.some((url) => url.endsWith("/mentions-legales")), false);
  assert.equal(urls.some((url) => url.includes("/agence/live-agency")), true);
});

test("MSE-25.8 site publication resolves tenant slug before authorizing a site", async () => {
  const database = {
    tenant: {
      async findUnique() {
        return { id: "tenant_mondescale" };
      },
    },
    agencySite: {
      async findFirst(query) {
        assert.deepEqual(query.where, {
          id: "site-1",
          tenantId: "tenant_mondescale",
        });
        return {
          id: "site-1",
          tenantId: "tenant_mondescale",
          agencyId: 3,
          slug: "dax",
        };
      },
    },
  };

  const req = request({ headers: { "x-tenant-slug": "mondescale" } });
  assert.equal(
    await publicationTenantIdForRequest(database, req),
    "tenant_mondescale"
  );

  const site = await assertSiteInTenant(database, req, "site-1");
  assert.equal(site.id, "site-1");
});

test("MSE-25.8 site publication rejects a cross-tenant site id", async () => {
  const database = {
    tenant: {
      async findUnique() {
        return { id: "tenant_mondescale" };
      },
    },
    agencySite: {
      async findFirst() {
        return null;
      },
    },
  };

  await assert.rejects(
    () =>
      assertSiteInTenant(
        database,
        request({ headers: { "x-tenant-slug": "mondescale" } }),
        "foreign-site"
      ),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, "SITE_NOT_FOUND");
      return true;
    }
  );
});
