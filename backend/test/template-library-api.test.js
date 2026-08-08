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
  normalizePageType,
  normalizeAgencyId,
} =
  require(
    "../src/modules/template-library/api-service"
  );

test(
  "normalise HOME",
  () => {
    assert.equal(
      normalizePageType(
        "home"
      ),
      "HOME"
    );
  }
);

test(
  "refuse un type inconnu",
  () => {
    assert.throws(
      () =>
        normalizePageType(
          "banana"
        ),
      error =>
        error.code ===
        "INVALID_TEMPLATE_PAGE_TYPE"
    );
  }
);

test(
  "normalise agencyId",
  () => {
    assert.equal(
      normalizeAgencyId(
        "6"
      ),
      6
    );
  }
);

test(
  "refuse agencyId invalide",
  () => {
    assert.throws(
      () =>
        normalizeAgencyId(
          "abc"
        ),
      error =>
        error.code ===
        "INVALID_AGENCY_ID"
    );
  }
);

test(
  "health interdit la publication",
  () => {
    const {
      TemplateLibraryApiService,
    } =
      require(
        "../src/modules/template-library/api-service"
      );

    const fakePrisma = {};

    const service =
      new TemplateLibraryApiService({
        prisma:
          fakePrisma,
      });

    assert.equal(
      service.health()
        .publishing,
      false
    );
  }
);
