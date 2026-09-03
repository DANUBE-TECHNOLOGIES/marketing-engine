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
  "le client expose le plan de publication",
  () => {
    assert.match(
      apiSource,
      /fetchSitePublicationPlan/
    );

    assert.match(
      apiSource,
      /suffix:\s*"plan"/
    );
  }
);

test(
  "le panneau affiche le plan",
  () => {
    assert.match(
      panelSource,
      /Plan de publication/
    );

    assert.match(
      panelSource,
      /Prévalidation non destructive/
    );

    assert.match(
      panelSource,
      /Sera publiée/
    );

    assert.match(
      panelSource,
      /Déjà publiée/
    );

    assert.match(
      panelSource,
      /Critères bloquants/
    );
  }
);
