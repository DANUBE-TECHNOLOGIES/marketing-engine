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
  AgencySiteProvisioningAdapter,
  normalizeAgencyIds,
  safeOptions,
} =
  require(
    "../src/modules/network-site-provisioning/agency-site-adapter"
  );

test(
  "normalise les agencyIds numériques et opaques",
  () => {
    assert.deepEqual(
      normalizeAgencyIds(
        [
          "6",
          6,
          null,
          "abc",
          "a",
          "b",
          "",
        ]
      ),
      [
        6,
        "abc",
        "a",
        "b",
      ]
    );
  }
);

test(
  "safeOptions conserve les agences et les gardes",
  () => {
    const result =
      safeOptions({
        agencyIds: [
          6,
        ],

        dryRun:
          false,

        overwrite:
          false,

        publish:
          false,
      });

    assert.deepEqual(
      result.agencyIds,
      [
        6,
      ]
    );

    assert.equal(
      result.dryRun,
      false
    );

    assert.equal(
      result.overwrite,
      false
    );

    assert.equal(
      result.publish,
      false
    );
  }
);

test(
  "execute transmet agencyIds au service existant",
  async () => {
    let received =
      null;

    const fakeService = {
      async provision(
        payload
      ) {
        received =
          payload;

        return {
          ok:
            true,
        };
      },
    };

    const adapter =
      new AgencySiteProvisioningAdapter({
        prisma: {},

        tenantId:
          "tenant_mondescale",

        service:
          fakeService,
      });

    const result =
      await adapter.execute({
        agencyIds: [
          6,
        ],

        dryRun:
          false,

        overwrite:
          false,

        publish:
          false,
      });

    assert.equal(
      result.ok,
      true
    );

    assert.deepEqual(
      received.agencyIds,
      [
        6,
      ]
    );

    assert.equal(
      received.tenantId,
      "tenant_mondescale"
    );

    assert.equal(
      received.dryRun,
      false
    );

    assert.equal(
      received.overwrite,
      false
    );

    assert.equal(
      received.publish,
      false
    );
  }
);

test(
  "preview force dryRun sans publication",
  async () => {
    let received =
      null;

    const fakeService = {
      async provision(
        payload
      ) {
        received =
          payload;

        return {
          ok:
            true,
        };
      },
    };

    const adapter =
      new AgencySiteProvisioningAdapter({
        prisma: {},

        tenantId:
          "tenant_mondescale",

        service:
          fakeService,
      });

    await adapter.preview({
      agencyIds: [
        6,
      ],
    });

    assert.deepEqual(
      received.agencyIds,
      [
        6,
      ]
    );

    assert.equal(
      received.dryRun,
      true
    );

    assert.equal(
      received.overwrite,
      false
    );

    assert.equal(
      received.publish,
      false
    );
  }
);
