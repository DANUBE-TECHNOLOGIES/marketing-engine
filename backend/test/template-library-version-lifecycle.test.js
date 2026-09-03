"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

test(
  "contrat lifecycle expose les méthodes",
  () => {
    const {
      TemplateLibraryApiService,
    } =
      require(
        "../src/modules/template-library/api-service"
      );

    for (
      const method
      of [
        "versionHistory",
        "rollbackAgencyTemplate",
        "revertToInheritance",
      ]
    ) {
      assert.equal(
        typeof TemplateLibraryApiService
          .prototype[
            method
          ],
        "function"
      );
    }
  }
);
