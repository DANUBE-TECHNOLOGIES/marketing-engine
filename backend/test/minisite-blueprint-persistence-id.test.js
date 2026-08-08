"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  normalizeModelId,
} = require(
  "../src/modules/minisite-blueprint-persistence/repository"
);

test(
  "convertit Agency.id en entier",
  () => {
    assert.equal(
      normalizeModelId(
        "Agency",
        "6"
      ),
      6
    );
  }
);

test(
  "conserve un entier Agency.id",
  () => {
    assert.equal(
      normalizeModelId(
        "Agency",
        6
      ),
      6
    );
  }
);

test(
  "refuse un identifiant Agency invalide",
  () => {
    assert.throws(
      () =>
        normalizeModelId(
          "Agency",
          "abc"
        ),
      {
        code:
          "BLUEPRINT_INVALID_MODEL_ID",
      }
    );
  }
);
