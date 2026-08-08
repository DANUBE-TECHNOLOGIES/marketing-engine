"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  normalizeSiteSlug,
  normalizeAgencyId,
  publicSiteContract,
} = require(
  "../src/modules/public-brand-legal/site-lookup"
);

test(
  "normalise un slug de mini-site",
  () => {
    assert.equal(
      normalizeSiteSlug(
        "/ambassade-fram-mondescale-bois-colombes/"
      ),
      "ambassade-fram-mondescale-bois-colombes"
    );
  }
);

test(
  "refuse un slug invalide",
  () => {
    assert.throws(
      () =>
        normalizeSiteSlug(
          "../secret"
        ),
      (error) => {
        assert.equal(
          error.code,
          "PUBLIC_BRAND_LEGAL_SITE_SLUG_INVALID"
        );

        return true;
      }
    );
  }
);

test(
  "normalise un agencyId",
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
      (error) => {
        assert.equal(
          error.code,
          "PUBLIC_BRAND_LEGAL_AGENCY_ID_INVALID"
        );

        return true;
      }
    );
  }
);

test(
  "n’expose qu’un contrat public du site",
  () => {
    assert.deepEqual(
      publicSiteContract({
        id:
          "site-1",

        slug:
          "agence-test",

        agencyId:
          6,

        name:
          "Agence test",

        basePath:
          "/agence/agence-test",

        status:
          "published",

        publishedAt:
          "2026-08-05T00:00:00.000Z",

        secret:
          "non-public",

        agency: {
          id:
            6,

          name:
            "Agence test",

          tenantId:
            "tenant-1",

          email:
            "private@example.test",
        },
      }),
      {
        id:
          "site-1",

        slug:
          "agence-test",

        agencyId:
          6,

        name:
          "Agence test",

        basePath:
          "/agence/agence-test",

        status:
          "published",

        publishedAt:
          "2026-08-05T00:00:00.000Z",

        agency: {
          id:
            6,

          name:
            "Agence test",

          tenantId:
            "tenant-1",
        },
      }
    );
  }
);
