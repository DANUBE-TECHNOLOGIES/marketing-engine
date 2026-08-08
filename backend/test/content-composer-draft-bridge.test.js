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
  ContentComposerService,
} =
  require(
    "../src/modules/content-composer"
  );

test(
  "refuse une génération non acceptée",
  async () => {
    const service =
      Object.create(
        ContentComposerService.prototype
      );

    await assert.rejects(
      () =>
        service.createDraftFromGeneration({
          tenantId:
            "tenant_mondescale",

          agencyId:
            6,

          generation: {
            accepted:
              false,

            persistence:
              false,

            publishing:
              false,
          },
        }),

      error =>
        error.code ===
        "GENERATION_NOT_ACCEPTED"
    );
  }
);

test(
  "refuse une génération avec état sécurité invalide",
  async () => {
    const service =
      Object.create(
        ContentComposerService.prototype
      );

    await assert.rejects(
      () =>
        service.createDraftFromGeneration({
          tenantId:
            "tenant_mondescale",

          agencyId:
            6,

          generation: {
            accepted:
              true,

            persistence:
              true,

            publishing:
              false,
          },
        }),

      error =>
        error.code ===
        "GENERATION_SECURITY_STATE_INVALID"
    );
  }
);

test(
  "le bridge ne possède aucune activation ou publication implicite",
  () => {
    const source =
      ContentComposerService
        .prototype
        .createDraftFromGeneration
        .toString();

    assert.doesNotMatch(
      source,
      /\.setAssignment\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.publish\s*\(/
    );

    assert.match(
      source,
      /assignmentChanged/
    );

    assert.match(
      source,
      /publishing/
    );
  }
);
