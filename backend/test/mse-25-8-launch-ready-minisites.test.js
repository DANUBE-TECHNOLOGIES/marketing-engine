"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  tenantIdForRequest,
  assertAgencyInTenant,
} = require("../src/modules/agency-launch/routes");

function request({ tenantId, tenantSlug, headers = {} } = {}) {
  return {
    tenantId,
    tenantSlug,
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

  const tenantId = await tenantIdForRequest(
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

  const tenantId = await tenantIdForRequest(
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
