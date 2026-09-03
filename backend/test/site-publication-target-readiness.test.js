"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SiteReadinessClient,
} = require("../src/modules/site-publication/readiness-client");
const {
  TargetedPrepublicationReadinessService,
} = require("../src/modules/agency-launch/targeted-prepublication-readiness");

test("SiteReadinessClient forwards the requested siteSlug", async () => {
  const originalFetch = global.fetch;
  let requestedUrl = null;

  global.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          readiness: { score: 100 },
          checks: [
            { code: "SITE", required: true, passed: true },
          ],
        });
      },
    };
  };

  try {
    const client = new SiteReadinessClient({
      backendOrigin: "http://backend.test",
    });

    await client.check({
      agencyId: 42,
      siteSlug: "amilly",
      headers: { "x-tenant-slug": "mondescale" },
    });

    assert.equal(
      requestedUrl,
      "http://backend.test/api/agency-launch/agencies/42/readiness?siteSlug=amilly"
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("TargetedPrepublicationReadinessService resolves the exact requested mini-site", async () => {
  const prisma = {
    agency: {
      async findFirst() {
        return {
          id: 42,
          name: "Agence test",
          city: "Amilly",
          address: "1 rue du test",
          postalCode: "45200",
          phone: "0102030405",
          email: "test@example.test",
          website: null,
          googleReviewUrl: null,
          googleLocationId: null,
          tenantId: "tenant-1",
          reviews: [],
          agencySites: [
            {
              id: "site-latest",
              slug: "another-site",
              pages: [],
            },
          ],
        };
      },
    },
    agencySite: {
      async findFirst(query) {
        assert.deepEqual(query.where, {
          agencyId: 42,
          tenantId: "tenant-1",
          slug: "amilly",
        });
        return {
          id: "site-amilly",
          agencyId: 42,
          tenantId: "tenant-1",
          slug: "amilly",
          pages: [],
        };
      },
    },
  };

  const service = new TargetedPrepublicationReadinessService({
    prisma,
    tenantId: "tenant-1",
  });
  service.siteSelector = { siteSlug: "amilly" };

  const agency = await service.loadAgency(42);

  assert.equal(agency.agencySites.length, 1);
  assert.equal(agency.agencySites[0].id, "site-amilly");
  assert.equal(agency.agencySites[0].slug, "amilly");
});

test("TargetedPrepublicationReadinessService does not fall back when the requested mini-site is missing", async () => {
  const prisma = {
    agency: {
      async findFirst() {
        return {
          id: 42,
          name: "Agence test",
          city: "Amilly",
          tenantId: "tenant-1",
          reviews: [],
          agencySites: [
            { id: "site-latest", slug: "another-site", pages: [] },
          ],
        };
      },
    },
    agencySite: {
      async findFirst() {
        return null;
      },
    },
  };

  const service = new TargetedPrepublicationReadinessService({
    prisma,
    tenantId: "tenant-1",
  });
  service.siteSelector = { siteSlug: "missing-site" };

  await assert.rejects(
    () => service.loadAgency(42),
    (error) => {
      assert.equal(error.code, "AGENCY_LAUNCH_SITE_NOT_FOUND");
      assert.equal(error.statusCode, 404);
      return true;
    }
  );
});
