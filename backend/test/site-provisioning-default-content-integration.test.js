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
} =
  require(
    "../src/modules/site-provisioning/service"
  );

function createRepo() {
  const site = {
    id:
      "site-1",

    slug:
      "agence-test",

    pages:
      [],
  };

  return {
    async listAgencies() {
      return [];
    },

    async getAgency(
      id
    ) {
      return {
        id,

        name:
          "Agence Test",

        city:
          "Testville",
      };
    },

    async getSiteByAgencyId() {
      return site;
    },

    async findBlock() {
      return {
        id:
          "existing-block",
      };
    },

    async createBlock() {
      throw new Error(
        "createBlock ne devrait pas être appelé"
      );
    },
  };
}

test(
  "provisionAgency appelle ensureDefaultContent lorsque disponible",
  async () => {
    const repo =
      createRepo();

    let receivedAgencyId =
      null;

    const siteService = {
      async ensureRequiredPages() {
        return {
          created:
            0,

          skipped:
            4,

          missing:
            [],

          site:
            await repo
              .getSiteByAgencyId(
                1
              ),
        };
      },

      async ensureDefaultContent(
        agencyId
      ) {
        receivedAgencyId =
          agencyId;

        return {
          result: {
            created:
              6,

            preserved:
              0,
          },

          plan: {
            summary: {
              pages:
                1,

              create:
                6,

              preserve:
                0,
            },
          },
        };
      },

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
        .provisionAgency(
          1,
          {
            seedBlocks:
              true,
          }
        );

    assert.equal(
      receivedAgencyId,
      1
    );

    assert.equal(
      result
        .defaultContent
        .supported,
      true
    );

    assert.equal(
      result
        .defaultContent
        .executed,
      true
    );

    assert.equal(
      result
        .defaultContent
        .result
        .created,
      6
    );
  }
);

test(
  "absence du writer reste compatible",
  async () => {
    const repo =
      createRepo();

    const siteService = {
      async generate() {
        throw new Error(
          "generate ne doit pas être appelé"
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
        .provisionAgency(
          1,
          {
            seedBlocks:
              false,
          }
        );

    assert.equal(
      result
        .defaultContent
        .supported,
      false
    );

    assert.equal(
      result
        .defaultContent
        .executed,
      false
    );

    assert.equal(
      result
        .defaultContent
        .reason,
      "DEFAULT_CONTENT_WRITER_UNAVAILABLE"
    );
  }
);

test(
  "le provisioning ne demande jamais de publication",
  async () => {
    const repo =
      createRepo();

    let defaultContentCalls =
      0;

    const siteService = {
      async ensureDefaultContent() {
        defaultContentCalls +=
          1;

        return {
          result: {
            created:
              0,

            preserved:
              6,
          },

          plan: {
            summary: {
              pages:
                1,

              create:
                0,

              preserve:
                6,
            },
          },
        };
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
        .provisionAgency(
          {
            agencyIds: [
              1,
            ],

            publish:
              false,

            overwrite:
              false,

            seedBlocks:
              false,
          }
        );

    assert.equal(
      defaultContentCalls,
      1
    );

    assert.equal(
      result
        .defaultContent
        .executed,
      true
    );
  }
);
