"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  normalizeAgencyId,
  normalizeEmail,
  normalizeUrl,
  normalizeDate,
  mergeDefined,
} = require(
  "../src/modules/legal-profile/service"
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
  "refuse un agencyId invalide",
  () => {
    assert.throws(
      () =>
        normalizeAgencyId(
          "bois-colombes"
        ),
      (
        error
      ) => {
        assert.equal(
          error.code,
          "LEGAL_PROFILE_AGENCY_ID_INVALID"
        );

        return true;
      }
    );
  }
);

test(
  "accepte une adresse email",
  () => {
    assert.equal(
      normalizeEmail(
        " juridique@mondescale.com "
      ),
      "juridique@mondescale.com"
    );
  }
);

test(
  "refuse une adresse email invalide",
  () => {
    assert.throws(
      () =>
        normalizeEmail(
          "adresse-invalide"
        ),
      (
        error
      ) => {
        assert.equal(
          error.code,
          "LEGAL_PROFILE_EMAIL_INVALID"
        );

        return true;
      }
    );
  }
);

test(
  "accepte une URL HTTPS",
  () => {
    assert.equal(
      normalizeUrl(
        "https://www.mondescale.com"
      ),
      "https://www.mondescale.com"
    );
  }
);

test(
  "refuse un protocole non HTTP",
  () => {
    assert.throws(
      () =>
        normalizeUrl(
          "javascript:alert(1)"
        ),
      (
        error
      ) => {
        assert.equal(
          error.code,
          "LEGAL_PROFILE_URL_PROTOCOL_INVALID"
        );

        return true;
      }
    );
  }
);

test(
  "normalise une date",
  () => {
    const date =
      normalizeDate(
        "2026-08-04"
      );

    assert.equal(
      date instanceof Date,
      true
    );

    assert.equal(
      Number.isNaN(
        date.getTime()
      ),
      false
    );
  }
);

test(
  "fusionne société et agence",
  () => {
    assert.deepEqual(
      mergeDefined(
        {
          legalName:
            "SAS DANUBE",

          privacyContactEmail:
            "societe@example.test",
        },
        {
          legalName:
            null,

          privacyContactEmail:
            "agence@example.test",
        }
      ),
      {
        legalName:
          "SAS DANUBE",

        privacyContactEmail:
          "agence@example.test",
      }
    );
  }
);
