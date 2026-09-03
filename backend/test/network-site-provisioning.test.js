"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  AgencySiteProvisioningAdapter,
  availableMethods,
} = require(
  "../src/modules/network-site-provisioning/agency-site-adapter"
);

const {
  NetworkSiteProvisioningService,
} = require(
  "../src/modules/network-site-provisioning/service"
);

const {
  normalizeIds,
  validateProvisionPayload,
} = require(
  "../src/modules/network-site-provisioning/validation"
);

test(
  "normalise et déduplique les agences",
  () => {
    assert.deepEqual(
      normalizeIds([
        "a",
        "a",
        " b ",
        "",
      ]),
      [
        "a",
        "b",
      ]
    );
  }
);

test(
  "active le dry-run par défaut",
  () => {
    const result =
      validateProvisionPayload(
        {}
      );

    assert.equal(
      result.dryRun,
      true
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
  "bloque un provisionnement global sans confirmation",
  () => {
    assert.throws(
      () =>
        validateProvisionPayload({
          dryRun: false,
        }),
      {
        code:
          "PROVISIONING_CONFIRMATION_REQUIRED",
      }
    );
  }
);

test(
  "autorise une agence ciblée sans confirmation globale",
  () => {
    const result =
      validateProvisionPayload({
        dryRun: false,
        agencyIds: [
          "agency-1",
        ],
      });

    assert.equal(
      result.dryRun,
      false
    );

    assert.deepEqual(
      result.agencyIds,
      [
        "agency-1",
      ]
    );
  }
);

test(
  "liste les méthodes du service existant",
  () => {
    class FakeService {
      status() {}
      provisionMissing() {}
    }

    const methods =
      availableMethods(
        new FakeService()
      );

    assert.ok(
      methods.includes(
        "status"
      )
    );

    assert.ok(
      methods.includes(
        "provisionMissing"
      )
    );
  }
);

test(
  "l’adaptateur délègue le statut",
  async () => {
    const adapter =
      new AgencySiteProvisioningAdapter({
        service: {
          async status(
            payload
          ) {
            return {
              payload,
              total: 9,
              missing: 2,
            };
          },
        },
      });

    const result =
      await adapter.status({
        tenantId:
          "tenant-1",
      });

    assert.equal(
      result.method,
      "status"
    );

    assert.equal(
      result.result.missing,
      2
    );
  }
);

test(
  "la prévisualisation utilise dryRun",
  async () => {
    let received = null;

    const service =
      new NetworkSiteProvisioningService({
        adapter: {
          capabilities() {
            return {};
          },

          async preview(
            payload
          ) {
            received =
              payload;

            return {
              method:
                "provisionMissing",

              result: {
                selected: 2,
              },
            };
          },
        },
      });

    const result =
      await service.preview({
        agencyIds: [
          "a",
          "b",
        ],
      });

    assert.equal(
      received.dryRun,
      true
    );

    assert.equal(
      result.data.selected,
      2
    );
  }
);

test(
  "l’exécution réelle délègue au service existant",
  async () => {
    const service =
      new NetworkSiteProvisioningService({
        adapter: {
          capabilities() {
            return {};
          },

          async execute(
            payload
          ) {
            return {
              method:
                "provisionMissing",

              result: {
                created:
                  payload.agencyIds,
              },
            };
          },
        },
      });

    const result =
      await service.execute({
        dryRun: false,

        agencyIds: [
          "agency-1",
        ],
      });

    assert.equal(
      result.operation,
      "execute"
    );

    assert.deepEqual(
      result.data.created,
      [
        "agency-1",
      ]
    );
  }
);

test(
  "l’adaptateur détecte le contrat site-provisioning",
  () => {
    const adapter =
      new AgencySiteProvisioningAdapter({
        service: {
          async status() {
            return {};
          },

          async provisionMissing() {
            return {};
          },
        },
      });

    const capabilities =
      adapter.capabilities();

    assert.equal(
      capabilities.provider,
      "site-provisioning"
    );

    assert.ok(
      capabilities.availableMethods
        .includes(
          "provisionMissing"
        )
    );
  }
);

test(
  "la prévisualisation utilise provisionMissing en dry-run",
  async () => {
    let received = null;

    const adapter =
      new AgencySiteProvisioningAdapter({
        service: {
          async provisionMissing(
            payload
          ) {
            received = payload;

            return {
              selected: 3,
            };
          },
        },
      });

    const result =
      await adapter.preview({
        publish: false,
      });

    assert.equal(
      result.method,
      "provisionMissing"
    );

    assert.equal(
      received.dryRun,
      true
    );

    assert.equal(
      result.result.selected,
      3
    );
  }
);

test(
  "privilégie l’injection directe du PrismaClient",
  () => {
    const fakePrisma = {
      agency: {
        findMany() {
          return [];
        },
      },
    };

    class DirectPrismaService {
      constructor(prisma) {
        this.prisma = prisma;
      }

      status() {
        return {
          ready:
            Boolean(
              this.prisma?.agency
                ?.findMany
            ),
        };
      }
    }

    const adapter =
      new AgencySiteProvisioningAdapter({
        prisma:
          fakePrisma,

        service:
          new DirectPrismaService(
            fakePrisma
          ),
      });

    assert.equal(
      adapter.service.prisma,
      fakePrisma
    );
  }
);

test(
  "la prévisualisation réelle utilise provisionBatch",
  async () => {
    let received = null;

    const adapter =
      new AgencySiteProvisioningAdapter({
        service: {
          async provisionBatch(
            payload
          ) {
            received =
              payload;

            return {
              selected: 4,
            };
          },
        },
      });

    const result =
      await adapter.preview({
        agencyIds: [
          "a",
          "b",
        ],
      });

    assert.equal(
      result.method,
      "provisionBatch"
    );

    assert.equal(
      received.dryRun,
      true
    );

    assert.deepEqual(
      received.agencyIds,
      [
        "a",
        "b",
      ]
    );
  }
);

test(
  "l’exécution d’une agence utilise provisionAgency",
  async () => {
    let received = null;

    const adapter =
      new AgencySiteProvisioningAdapter({
        service: {
          async provisionAgency(
            payload
          ) {
            received =
              payload;

            return {
              agencyId:
                payload.agencyId,
            };
          },
        },
      });

    const result =
      await adapter.execute({
        agencyIds: [
          "agency-1",
        ],

        dryRun:
          false,
      });

    assert.equal(
      result.method,
      "provisionAgency"
    );

    assert.equal(
      received.agencyId,
      "agency-1"
    );
  }
);

test(
  "l’exécution de plusieurs agences utilise provisionBatch",
  async () => {
    let received = null;

    const adapter =
      new AgencySiteProvisioningAdapter({
        service: {
          async provisionBatch(
            payload
          ) {
            received =
              payload;

            return {
              selected:
                payload.agencyIds.length,
            };
          },
        },
      });

    const result =
      await adapter.execute({
        agencyIds: [
          "agency-1",
          "agency-2",
        ],

        dryRun:
          false,
      });

    assert.equal(
      result.method,
      "provisionBatch"
    );

    assert.equal(
      received.dryRun,
      false
    );
  }
);
