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
  NetworkSiteProvisioningService,
  provisioningContext,
} = require(
  "../src/modules/network-site-provisioning/service"
);

test(
  "provisioningContext extrait tenantId",
  () => {
    assert.deepEqual(
      provisioningContext({
        tenantId:
          "tenant_mondescale",
      }),
      {
        tenantId:
          "tenant_mondescale",
      }
    );
  }
);

test(
  "preview transmet tenantId comme contexte séparé",
  async () => {
    let receivedInput =
      null;

    let receivedContext =
      null;

    const adapter = {
      capabilities() {
        return {};
      },

      async preview(
        input,
        context
      ) {
        receivedInput =
          input;

        receivedContext =
          context;

        return {
          method:
            "provisionBatch",

          result: {
            selected:
              1,
          },
        };
      },
    };

    const service =
      new NetworkSiteProvisioningService({
        adapter,
      });

    const result =
      await service.preview({
        tenantId:
          "tenant_mondescale",

        agencyIds: [
          6,
        ],

        publish:
          false,

        overwrite:
          false,
      });

    assert.equal(
      receivedContext.tenantId,
      "tenant_mondescale"
    );

    /*
     * tenantId n'appartient pas au payload métier validé.
     */
    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          receivedInput,
          "tenantId"
        ),
      false
    );

    assert.deepEqual(
      receivedInput.agencyIds,
      [
        "6",
      ]
    );

    assert.equal(
      receivedInput.dryRun,
      true
    );

    assert.equal(
      receivedInput.publish,
      false
    );

    assert.equal(
      result.delegatedMethod,
      "provisionBatch"
    );
  }
);

test(
  "execute transmet tenantId comme contexte séparé",
  async () => {
    let receivedInput =
      null;

    let receivedContext =
      null;

    const adapter = {
      capabilities() {
        return {};
      },

      async execute(
        input,
        context
      ) {
        receivedInput =
          input;

        receivedContext =
          context;

        return {
          method:
            "provisionAgency",

          result: {
            agencyId:
              6,
          },
        };
      },
    };

    const service =
      new NetworkSiteProvisioningService({
        adapter,
      });

    const result =
      await service.execute({
        tenantId:
          "tenant_mondescale",

        agencyIds: [
          6,
        ],

        dryRun:
          false,

        publish:
          false,

        overwrite:
          false,
      });

    assert.equal(
      receivedContext.tenantId,
      "tenant_mondescale"
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          receivedInput,
          "tenantId"
        ),
      false
    );

    assert.equal(
      receivedInput.dryRun,
      false
    );

    assert.equal(
      result.delegatedMethod,
      "provisionAgency"
    );
  }
);

test(
  "execute dryRun conserve tenantId pendant le basculement preview",
  async () => {
    let receivedContext =
      null;

    const adapter = {
      capabilities() {
        return {};
      },

      async preview(
        input,
        context
      ) {
        receivedContext =
          context;

        return {
          method:
            "provisionBatch",

          result: {
            dryRun:
              true,
          },
        };
      },
    };

    const service =
      new NetworkSiteProvisioningService({
        adapter,
      });

    const result =
      await service.execute({
        tenantId:
          "tenant_mondescale",

        agencyIds: [
          6,
        ],

        dryRun:
          true,
      });

    assert.equal(
      receivedContext.tenantId,
      "tenant_mondescale"
    );

    assert.equal(
      result.operation,
      "preview"
    );
  }
);

test(
  "status transmet tenantId au contexte",
  async () => {
    let receivedContext =
      null;

    const adapter = {
      capabilities() {
        return {};
      },

      async status(
        input,
        context
      ) {
        receivedContext =
          context;

        return {
          method:
            "status",

          result: {
            totalAgencies:
              9,
          },
        };
      },
    };

    const service =
      new NetworkSiteProvisioningService({
        adapter,
      });

    await service.status({
      tenantId:
        "tenant_mondescale",
    });

    assert.equal(
      receivedContext.tenantId,
      "tenant_mondescale"
    );
  }
);
