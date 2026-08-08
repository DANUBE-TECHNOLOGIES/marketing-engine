import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../components/brand-studio/BrandStudioWorkspace.js",
      import.meta.url
    ),
    "utf8"
  );

test(
  "le workspace possède un état agencyId canonique",
  () => {
    assert.match(
      source,
      /agencyId/
    );

    assert.match(
      source,
      /setAgencyId/
    );

    assert.match(
      source,
      /initialAgencyId/
    );
  }
);

test(
  "le sélecteur nominatif est intégré",
  () => {
    assert.match(
      source,
      /BrandAgencySelector/
    );

    assert.match(
      source,
      /handleAgencyChange/
    );

    assert.match(
      source,
      /selectedAgency/
    );
  }
);

test(
  "les trois sections fonctionnelles sont présentes",
  () => {
    assert.match(
      source,
      /Identité visuelle/
    );

    assert.match(
      source,
      /Médiathèque/
    );

    assert.match(
      source,
      /Profil juridique/
    );
  }
);

test(
  "les gestionnaires sont embarqués",
  () => {
    assert.match(
      source,
      /BrandMediaManager/
    );

    assert.match(
      source,
      /LegalProfileManager/
    );
  }
);
