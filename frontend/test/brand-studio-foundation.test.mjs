import test from "node:test";
import assert from "node:assert/strict";

import {
  BRAND_ASSET_KINDS,
  BRAND_PROFILE_ASSET_FIELDS,
  buildAssetQuery,
  buildTenantHeaders,
  normalizeHexColor,
  validateBrandProfile,
  validateLegalProfile,
} from "../lib/brand-studio/index.js";

test(
  "expose les types de médias attendus",
  () => {
    assert.equal(
      BRAND_ASSET_KINDS.includes(
        "logo-primary"
      ),
      true
    );

    assert.equal(
      BRAND_ASSET_KINDS.includes(
        "hero"
      ),
      true
    );
  }
);

test(
  "associe les champs du profil aux types de médias",
  () => {
    assert.equal(
      BRAND_PROFILE_ASSET_FIELDS
        .logoPrimaryId,
      "logo-primary"
    );

    assert.equal(
      BRAND_PROFILE_ASSET_FIELDS
        .faviconId,
      "favicon"
    );
  }
);

test(
  "construit les en-têtes du tenant",
  () => {
    assert.deepEqual(
      buildTenantHeaders({
        tenantId:
          "tenant-1",
      }),
      {
        Accept:
          "application/json",

        "x-tenant-id":
          "tenant-1",
      }
    );
  }
);

test(
  "construit une requête de médiathèque",
  () => {
    assert.equal(
      buildAssetQuery({
        agencyId:
          6,

        kind:
          "logo-primary",

        limit:
          25,
      }),
      "?agencyId=6&kind=logo-primary&limit=25"
    );
  }
);

test(
  "normalise une couleur",
  () => {
    assert.equal(
      normalizeHexColor(
        "#aabbcc"
      ),
      "#AABBCC"
    );
  }
);

test(
  "détecte une couleur invalide",
  () => {
    assert.equal(
      validateBrandProfile({
        primaryColor:
          "rouge",
      }).primaryColor,
      "Utilisez le format #RRGGBB."
    );
  }
);

test(
  "détecte un email juridique invalide",
  () => {
    assert.equal(
      validateLegalProfile({
        privacyContactEmail:
          "adresse-invalide",
      }).privacyContactEmail,
      "L’adresse électronique est invalide."
    );
  }
);
