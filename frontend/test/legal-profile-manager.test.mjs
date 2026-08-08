import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeAgencyId,
  normalizeLegalProfile,
  validateLegalProfile,
} from "../lib/brand-studio/legal-api.js";

test(
  "normalise un profil juridique",
  () => {
    const result =
      normalizeLegalProfile({
        legalName:
          "SAS DANUBE",

        siret:
          "12345678900000",

        pages: {
          legalNotice:
            "<p>Mentions</p>",

          privacyPolicy:
            "<p>Confidentialité</p>",
        },
      });

    assert.equal(
      result.companyName,
      "SAS DANUBE"
    );

    assert.equal(
      result.registrationNumber,
      "12345678900000"
    );

    assert.equal(
      result.legalNotice,
      "<p>Mentions</p>"
    );
  }
);

test(
  "valide un identifiant agence",
  () => {
    assert.equal(
      normalizeAgencyId("6"),
      6
    );

    assert.throws(
      () =>
        normalizeAgencyId(
          "bois-colombes"
        )
    );
  }
);

test(
  "détecte les champs juridiques manquants",
  () => {
    const errors =
      validateLegalProfile({
        companyName:
          "",

        legalEmail:
          "adresse-invalide",

        dpoEmail:
          "",

        legalNotice:
          "",

        privacyPolicy:
          "",
      });

    assert.equal(
      errors.companyName,
      "La raison sociale est obligatoire."
    );

    assert.equal(
      errors.legalEmail,
      "L’adresse juridique est invalide."
    );

    assert.equal(
      errors.legalNotice,
      "Les mentions légales sont obligatoires."
    );

    assert.equal(
      errors.privacyPolicy,
      "La politique de confidentialité est obligatoire."
    );
  }
);

test(
  "accepte un profil juridique minimal valide",
  () => {
    const errors =
      validateLegalProfile({
        companyName:
          "SAS DANUBE",

        legalEmail:
          "contact@example.test",

        dpoEmail:
          "dpo@example.test",

        legalNotice:
          "<p>Mentions</p>",

        privacyPolicy:
          "<p>Confidentialité</p>",
      });

    assert.deepEqual(
      errors,
      {}
    );
  }
);
