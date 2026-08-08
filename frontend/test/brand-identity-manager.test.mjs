import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  DEFAULT_IDENTITY,
  buildBrandProfilePayload,
  normalizeBrandIdentity,
  validHexColor,
  validateBrandIdentity,
} from "../lib/brand-studio/identity-api.js";

test(
  "valide les couleurs hexadécimales",
  () => {
    assert.equal(
      validHexColor(
        "#112233"
      ),
      true
    );

    assert.equal(
      validHexColor(
        "#123"
      ),
      false
    );
  }
);

test(
  "normalise une identité vide",
  () => {
    const result =
      normalizeBrandIdentity(
        {}
      );

    assert.equal(
      result.primaryColor,
      DEFAULT_IDENTITY.primaryColor
    );

    assert.equal(
      result.headingFont,
      DEFAULT_IDENTITY.headingFont
    );
  }
);

test(
  "préserve les médias lors de l’enregistrement",
  () => {
    const result =
      buildBrandProfilePayload({
        agencyId:
          6,

        profile: {
          logoPrimaryId:
            "logo-1",

          faviconId:
            "favicon-1",

          values: {
            existingField:
              "conservé",
          },
        },

        identity:
          DEFAULT_IDENTITY,
      });

    assert.equal(
      result.logoPrimaryId,
      "logo-1"
    );

    assert.equal(
      result.faviconId,
      "favicon-1"
    );

    assert.equal(
      result.values.existingField,
      "conservé"
    );
  }
);

test(
  "détecte une couleur invalide",
  () => {
    const errors =
      validateBrandIdentity({
        ...DEFAULT_IDENTITY,

        accentColor:
          "orange",
      });

    assert.equal(
      errors.accentColor,
      "La couleur doit utiliser le format #RRGGBB."
    );
  }
);

test(
  "le workspace utilise BrandIdentityManager",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../components/brand-studio/BrandStudioWorkspace.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /BrandIdentityManager/
    );

    assert.match(
      source,
      /identity-\$\{agencyId\}/
    );
  }
);
