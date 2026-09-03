"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  SiteProvisioningService,
  normalizeAgencyInvocation,
} =
  require(
    "../src/modules/site-provisioning/service"
  );

test(
  "normalise la signature native provisionAgency",
  () => {
    const result =
      normalizeAgencyInvocation(
        6,
        {
          seedBlocks:
            false,
        }
      );

    assert.equal(
      result.agencyId,
      6
    );

    assert.equal(
      result.options
        .seedBlocks,
      false
    );
  }
);

test(
  "normalise le payload network provisionAgency",
  () => {
    const result =
      normalizeAgencyInvocation({
        agencyIds: [
          "6",
        ],

        seedBlocks:
          true,

        tenantId:
          "tenant_mondescale",
      });

    assert.equal(
      result.agencyId,
      6
    );

    assert.equal(
      result.options
        .seedBlocks,
      true
    );

    assert.equal(
      result.options
        .tenantId,
      undefined
    );
  }
);

test(
  "provisionAgency réseau appelle getAgency avec un Int",
  async () => {
    let receivedAgencyId =
      null;

    const repo = {
      async listAgencies() {
        return [];
      },

      async getAgency(
        agencyId
      ) {
        receivedAgencyId =
          agencyId;

        return {
          id:
            agencyId,

          name:
            "Agence test",
        };
      },

      async getSiteByAgencyId() {
        return {
          id:
            "site-1",

          slug:
            "agence-test",

          pages:
            [],
        };
      },

      async findBlock() {
        return null;
      },

      async createBlock() {
        return null;
      },
    };

    const siteService = {
      async generate() {
        throw new Error(
          "generate ne doit pas être appelé pour un site existant"
        );
      },
    };

    const service =
      new SiteProvisioningService(
        repo,
        "tenant_test",
        siteService
      );

    const result =
      await service
        .provisionAgency({
          agencyIds: [
            "6",
          ],

          dryRun:
            false,

          publish:
            false,

          overwrite:
            false,

          seedBlocks:
            false,
        });

    assert.equal(
      receivedAgencyId,
      6
    );

    assert.equal(
      result.agencyId,
      6
    );
  }
);
