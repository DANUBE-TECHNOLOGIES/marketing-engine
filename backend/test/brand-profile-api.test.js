"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  normalizeAgencyId,
  normalizeColor,
  mergeDefined,
} = require(
  "../src/modules/brand-profile/service"
);

test(
  "normalise la portée société",
  () => {
    assert.equal(
      normalizeAgencyId(""),
      null
    );
  }
);

test(
  "normalise une agence",
  () => {
    assert.equal(
      normalizeAgencyId("6"),
      6
    );
  }
);

test(
  "refuse une agence non numérique",
  () => {
    assert.throws(
      () =>
        normalizeAgencyId(
          "bois-colombes"
        ),
      (error) => {
        assert.equal(
          error.code,
          "BRAND_PROFILE_AGENCY_ID_INVALID"
        );

        return true;
      }
    );
  }
);

test(
  "normalise une couleur hexadécimale",
  () => {
    assert.equal(
      normalizeColor(
        "#aabbcc",
        "primaryColor"
      ),
      "#AABBCC"
    );
  }
);

test(
  "refuse une couleur invalide",
  () => {
    assert.throws(
      () =>
        normalizeColor(
          "rouge",
          "primaryColor"
        ),
      (error) => {
        assert.equal(
          error.code,
          "BRAND_PROFILE_COLOR_INVALID"
        );

        return true;
      }
    );
  }
);

test(
  "fusionne société et surcharge agence",
  () => {
    assert.deepEqual(
      mergeDefined(
        {
          primaryColor:
            "#111111",

          headingFont:
            "Inter",
        },
        {
          primaryColor:
            "#222222",

          headingFont:
            null,

          bodyFont:
            "Roboto",
        }
      ),
      {
        primaryColor:
          "#222222",

        headingFont:
          "Inter",

        bodyFont:
          "Roboto",
      }
    );
  }
);
