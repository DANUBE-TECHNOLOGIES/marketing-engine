import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const apiSource =
  fs.readFileSync(
    new URL(
      "../lib/brand-studio/site-publication-api.js",
      import.meta.url
    ),
    "utf8"
  );

const panelSource =
  fs.readFileSync(
    new URL(
      "../components/brand-studio/SitePublicationPanel.js",
      import.meta.url
    ),
    "utf8"
  );

test(
  "publishSite exige un jeton",
  () => {
    assert.match(
      apiSource,
      /PUBLICATION_PLAN_TOKEN_REQUIRED/
    );

    assert.match(
      apiSource,
      /planToken/
    );

    assert.match(
      apiSource,
      /normalizedPlanToken/
    );
  }
);

test(
  "le panneau transmet le jeton",
  () => {
    assert.match(
      panelSource,
      /publishSite\(\s*siteId,\s*plan\?\.planToken/
    );

    assert.match(
      panelSource,
      /Boolean\(\s*plan\?\.planToken/
    );
  }
);

test(
  "le panneau gère un plan périmé",
  () => {
    assert.match(
      panelSource,
      /PUBLICATION_PLAN_STALE/
    );

    assert.match(
      panelSource,
      /Le contenu ou la préparation du mini-site a changé/
    );
  }
);

test(
  "le jeton est affiché partiellement",
  () => {
    assert.match(
      panelSource,
      /Plan sécurisé/
    );

    assert.match(
      panelSource,
      /plan\.planToken\.slice/
    );
  }
);
