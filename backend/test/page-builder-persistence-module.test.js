"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const PageBuilderPersistenceService =
  require(
    "../src/modules/page-builder-persistence/service"
  );

const persistence =
  require(
    "../src/modules/page-builder-persistence"
  );

test(
  "service.js exporte directement la classe",
  () => {
    assert.equal(
      typeof PageBuilderPersistenceService,
      "function"
    );
  }
);

test(
  "index.js réexporte la classe",
  () => {
    assert.equal(
      persistence
        .PageBuilderPersistenceService,
      PageBuilderPersistenceService
    );
  }
);

test(
  "index.js expose les routes",
  () => {
    assert.equal(
      typeof persistence.routes,
      "function"
    );
  }
);

test(
  "le constructeur accepte prisma et tenantId",
  () => {
    const service =
      new PageBuilderPersistenceService(
        {},
        "tenant-test"
      );

    assert.equal(
      typeof service.get,
      "function"
    );

    assert.equal(
      typeof service.save,
      "function"
    );
  }
);
