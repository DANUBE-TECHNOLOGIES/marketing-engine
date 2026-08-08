import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workspacePath =
  new URL(
    "../components/brand-studio/BrandStudioWorkspace.js",
    import.meta.url
  );

const pagePath =
  new URL(
    "../app/brand-studio/page.js",
    import.meta.url
  );

test(
  "le workspace expose les trois sections",
  () => {
    const source =
      fs.readFileSync(
        workspacePath,
        "utf8"
      );

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
  "le workspace embarque les gestionnaires existants",
  () => {
    const source =
      fs.readFileSync(
        workspacePath,
        "utf8"
      );

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

test(
  "la page principale utilise le workspace",
  () => {
    const source =
      fs.readFileSync(
        pagePath,
        "utf8"
      );

    assert.match(
      source,
      /BrandStudioWorkspace/
    );

    assert.match(
      source,
      /initialAgencyId=\{6\}/
    );
  }
);

test(
  "le changement d’agence est disponible",
  () => {
    const source =
      fs.readFileSync(
        workspacePath,
        "utf8"
      );

    assert.match(
      source,
      /Agence sélectionnée/
    );

    assert.match(
      source,
      /setAgencyId/
    );
  }
);
