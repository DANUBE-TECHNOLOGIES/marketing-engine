"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const DestinationService = require(
  "../src/modules/destination-engine/service"
);

test("MSE-25.3 charge une destination publique dans le tenant du mini-site", async () => {
  let destinationWhere = null;

  const prisma = {
    agencySite: {
      async findUnique() {
        return {
          id: "site-1",
          slug: "lamorlaye",
          name: "Mondescale Lamorlaye",
          tenantId: "tenant-a",
          status: "published",
          agency: {
            id: 6,
            tenantId: "tenant-a",
          },
        };
      },
    },
    destination: {
      async findFirst(query) {
        destinationWhere = query.where;
        return {
          id: "destination-1",
          tenantId: "tenant-a",
          slug: "sicile",
          name: "Sicile",
          status: "published",
          sections: [],
          faqs: [],
        };
      },
    },
  };

  const service = new DestinationService(prisma);
  const result = await service.publicForSite(
    "lamorlaye",
    "sicile"
  );

  assert.deepEqual(destinationWhere, {
    tenantId: "tenant-a",
    slug: "sicile",
    status: "published",
  });

  assert.equal(
    result.canonicalPath,
    "/agence/lamorlaye/destination/sicile"
  );
});

test("MSE-25.3 refuse les destinations derrière un mini-site non publié", async () => {
  let destinationQueries = 0;

  const prisma = {
    agencySite: {
      async findUnique() {
        return {
          id: "site-draft",
          slug: "agence-draft",
          tenantId: "tenant-a",
          status: "draft",
          agency: {
            id: 6,
            tenantId: "tenant-a",
          },
        };
      },
    },
    destination: {
      async findFirst() {
        destinationQueries += 1;
        return null;
      },
    },
  };

  const service = new DestinationService(prisma);

  await assert.rejects(
    service.publicForSite("agence-draft", "sicile"),
    (error) => error.statusCode === 404
  );

  assert.equal(destinationQueries, 0);
});
